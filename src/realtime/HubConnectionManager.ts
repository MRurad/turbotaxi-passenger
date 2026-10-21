import {
  HttpError,
  HttpTransportType,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
  type ILogger,
} from '@microsoft/signalr';
import type { z } from 'zod';

import { REALTIME_RECONNECT_DELAYS_MS } from '@/constants/timeouts';
import { logger } from '@/lib/logger';

import { useRealtimeDebug } from './debugLog';
import type { HubName } from './events';
import { TappingHubProtocol, type RawInvocation } from './protocol';

/**
 * idle: not wanted (logged out / stopped). connecting: first connect. connected.
 * reconnecting: dropped, SignalR is retrying. disconnected: wanted but down, retry scheduled.
 */
export type HubState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type Schemas<M> = { [K in keyof M]: z.ZodType<M[K]> };
type OnConnectAction = () => Promise<unknown> | unknown;
interface HandlerEntry {
  handler: (payload: never) => void;
}

/** A failing on-connect action (e.g. SubscribeUser) is retried this often, then we reconnect. */
export const ON_CONNECT_MAX_ATTEMPTS = 3;

export interface HubManagerOptions<M> {
  hub: HubName;
  /** Absolute hub URL. */
  url: string;
  /** Known server → client events and schemas of their argument lists. */
  schemas: Schemas<M>;
  /** Current JWT (read on every (re)connect); should throw when there is none. */
  accessTokenFactory: () => string;
  /** Checked before every (re)connect; false → stop trying and call onSessionInvalid. */
  isSessionValid?: () => boolean;
  /** Expired/absent session or a 401 from the hub (e.g. log out). */
  onSessionInvalid?: () => void;
}

const LAST_DELAY = REALTIME_RECONNECT_DELAYS_MS[REALTIME_RECONNECT_DELAYS_MS.length - 1] ?? 0;

/** Delay before retry #n (0-based): the table, then the last value forever. */
export function retryDelay(attempt: number): number {
  return REALTIME_RECONNECT_DELAYS_MS[attempt] ?? LAST_DELAY;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** SignalR's own logs → our dev logger (its console logger would raise LogBox errors). */
const signalrLogger: ILogger = {
  log: (level, message) => {
    if (level >= LogLevel.Warning) logger.warn(`signalr: ${message}`);
  },
};

function isUnauthorized(error: unknown): boolean {
  return (
    (error instanceof HttpError && error.statusCode === 401) ||
    /\b401\b|unauthori[sz]ed/i.test(messageOf(error))
  );
}

/** Errors that mean "our own state was wrong", not "the server refused this transport". */
function isLocalStateError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    /not in the 'Disconnected' state/.test(messageOf(error))
  );
}

/**
 * One SignalR hub. Handles connect/retry, typed + validated events, on-connect actions that
 * re-run after every reconnect (group membership is lost on reconnect), and dev logging of
 * events nobody handles. Callbacks from a replaced connection are ignored.
 */
export class HubConnectionManager<M extends Record<string, unknown>> {
  private connection: HubConnection | null = null;
  private state: HubState = 'idle';
  private readonly stateListeners = new Set<(state: HubState) => void>();
  private readonly handlers = new Map<keyof M, Set<HandlerEntry>>();
  private readonly onConnectActions = new Set<OnConnectAction>();
  private readonly actionTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly knownEvents: ReadonlySet<string>;
  private wanted = false;
  private starting: Promise<void> | null = null;
  private stopping: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  /** Starts with skipNegotiation (WebSockets only); falls back once if the server refuses. */
  private negotiate = false;

  constructor(private readonly options: HubManagerOptions<M>) {
    this.knownEvents = new Set(Object.keys(options.schemas).map((n) => n.toLowerCase()));
  }

  getState(): HubState {
    return this.state;
  }

  /** True while the app wants this hub connected (used to restore hubs after backgrounding). */
  wasWanted(): boolean {
    return this.wanted;
  }

  /** Subscribe to state changes; returns the unsubscribe function. Stable reference. */
  subscribe = (listener: (state: HubState) => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  /** Connect (idempotent). Keeps retrying in the background until stop(). */
  start(): Promise<void> {
    this.wanted = true;
    // Connected, or SignalR's automatic reconnect is already working on it.
    if (this.state === 'connected' || this.state === 'reconnecting') return Promise.resolve();
    this.starting ??= this.connect().finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  /** Disconnect and stop retrying. A start() right after waits for this to finish. */
  stop(): Promise<void> {
    this.wanted = false;
    this.clearTimers();
    this.attempt = 0;
    this.setState('idle');
    const connection = this.connection;
    if (!connection) return Promise.resolve();
    this.stopping ??= connection
      .stop()
      .catch(() => undefined)
      .finally(() => {
        this.stopping = null;
      });
    return this.stopping;
  }

  /** Logout: stop and forget every on-connect action (they belong to the old user). */
  reset(): Promise<void> {
    this.onConnectActions.clear();
    return this.stop();
  }

  /** Server method call; rejects when not connected. */
  invoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.connection || this.state !== 'connected') {
      return Promise.reject(new Error(`${this.options.hub} hub not connected`));
    }
    return this.connection.invoke(method, ...args);
  }

  /** Typed, validated event handler. Returns the unsubscribe function (use in effect cleanup). */
  on<K extends keyof M>(event: K, handler: (payload: M[K]) => void): () => void {
    const entry: HandlerEntry = { handler: handler as (payload: never) => void };
    const set = this.handlers.get(event) ?? new Set<HandlerEntry>();
    set.add(entry);
    this.handlers.set(event, set);
    return () => {
      set.delete(entry);
      if (set.size === 0 && this.handlers.get(event) === set) this.handlers.delete(event);
    };
  }

  /**
   * Runs after every successful connect and reconnect (e.g. SubscribeUser, JoinRideChat).
   * Runs immediately if already connected. Returns a remover.
   */
  addOnConnect(action: OnConnectAction): () => void {
    this.onConnectActions.add(action);
    if (this.state === 'connected' && this.connection) this.runAction(action, this.connection, 0);
    return () => this.onConnectActions.delete(action);
  }

  private setState(state: HubState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  private sessionValid(): boolean {
    return this.options.isSessionValid?.() ?? true;
  }

  private invalidateSession(): void {
    this.wanted = false;
    this.clearTimers();
    this.setState('idle');
    this.options.onSessionInvalid?.();
  }

  private build(): HubConnection {
    const { url, accessTokenFactory, schemas } = this.options;
    const connection = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory,
        transport: HttpTransportType.WebSockets,
        skipNegotiation: !this.negotiate,
      })
      .withAutomaticReconnect({
        // null stops SignalR's reconnect loop (onclose then decides what to do).
        nextRetryDelayInMilliseconds: (ctx) =>
          this.sessionValid() ? retryDelay(ctx.previousRetryCount) : null,
      })
      .withHubProtocol(new TappingHubProtocol((invocation) => this.onRawInvocation(invocation)))
      .configureLogging(__DEV__ ? signalrLogger : LogLevel.None)
      .build();

    const isCurrent = () => connection === this.connection;
    for (const event of Object.keys(schemas)) {
      connection.on(event, (...args: unknown[]) => this.dispatch(event, args));
    }
    connection.onreconnecting(() => {
      if (isCurrent() && this.wanted) this.setState('reconnecting');
    });
    connection.onreconnected(() => {
      if (!isCurrent() || !this.wanted) return;
      this.setState('connected');
      this.runOnConnect(connection);
    });
    connection.onclose(() => {
      // Ignore a late close from a replaced connection, or the close our own stop() caused.
      if (!isCurrent() || !this.wanted) return;
      if (!this.sessionValid()) {
        this.invalidateSession();
        return;
      }
      this.setState('disconnected');
      this.scheduleRetry();
    });
    return connection;
  }

  private async connect(): Promise<void> {
    if (this.stopping) await this.stopping;
    if (!this.wanted) return;
    if (!this.sessionValid()) {
      this.invalidateSession();
      return;
    }
    this.clearRetry();
    if (this.state !== 'disconnected') this.setState('connecting');
    const connection = (this.connection ??= this.build());
    if (connection.state === HubConnectionState.Connected) {
      this.setState('connected');
      return;
    }
    try {
      await connection.start();
      if (connection !== this.connection) return;
      this.attempt = 0;
      if (!this.wanted) {
        await connection.stop().catch(() => undefined);
        return;
      }
      this.setState('connected');
      this.runOnConnect(connection);
    } catch (error) {
      if (!this.wanted || connection !== this.connection) return;
      if (isUnauthorized(error) || !this.sessionValid()) {
        this.invalidateSession();
        return;
      }
      if (!this.negotiate && this.attempt === 0 && !isLocalStateError(error)) {
        // Some servers/proxies need the negotiate step: rebuild without skipNegotiation once.
        logger.warn(
          `realtime: ${this.options.hub} skipNegotiation failed, retrying with negotiate`,
        );
        this.negotiate = true;
        this.connection = null;
        this.attempt += 1;
        return this.connect();
      }
      logger.warn(`realtime: ${this.options.hub} connect failed`, { message: messageOf(error) });
      this.setState('disconnected');
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    this.clearRetry();
    const delay = retryDelay(this.attempt);
    this.attempt += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.start().catch(() => undefined);
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private clearTimers(): void {
    this.clearRetry();
    this.actionTimers.forEach(clearTimeout);
    this.actionTimers.clear();
  }

  private runOnConnect(connection: HubConnection): void {
    this.onConnectActions.forEach((action) => this.runAction(action, connection, 0));
  }

  /**
   * A failed action (e.g. SubscribeUser) would leave a "connected" socket outside the user's
   * group: retry it with backoff, and after ON_CONNECT_MAX_ATTEMPTS force a reconnect.
   */
  private runAction(action: OnConnectAction, connection: HubConnection, attempt: number): void {
    Promise.resolve()
      .then(action)
      .catch((error: unknown) => {
        logger.warn(`realtime: ${this.options.hub} on-connect action failed`, {
          attempt,
          message: messageOf(error),
        });
        const stillRelevant =
          connection === this.connection &&
          this.state === 'connected' &&
          this.onConnectActions.has(action);
        if (!stillRelevant) return;
        if (attempt + 1 >= ON_CONNECT_MAX_ATTEMPTS) {
          // onclose → disconnected → retry → actions run again on the new connection.
          connection.stop().catch(() => undefined);
          return;
        }
        const timer = setTimeout(
          () => {
            this.actionTimers.delete(timer);
            this.runAction(action, connection, attempt + 1);
          },
          retryDelay(attempt + 1),
        );
        this.actionTimers.add(timer);
      });
  }

  /**
   * Validates the whole argument list (the server sends positional arguments, e.g.
   * DriverLocationUpdated(driverId, lat, lng)) and fans out; invalid payloads are dropped.
   */
  private dispatch(event: string, args: unknown[]): void {
    const key = event as keyof M;
    const parsed = this.options.schemas[key].safeParse(args);
    if (!parsed.success) {
      logger.warn(`realtime: invalid ${event} payload`, { issues: parsed.error.issues.length });
      return;
    }
    this.handlers.get(key)?.forEach(({ handler }) => {
      try {
        (handler as (payload: M[keyof M]) => void)(parsed.data);
      } catch (error) {
        // One broken handler must not starve the others.
        logger.warn(`realtime: ${event} handler threw`, { message: messageOf(error) });
      }
    });
  }

  private onRawInvocation({ target, args }: RawInvocation): void {
    const known = this.knownEvents.has(target.toLowerCase());
    useRealtimeDebug.getState().record({ hub: this.options.hub, name: target, args, known });
    if (!known) logger.warn(`realtime: unknown ${this.options.hub} event "${target}"`);
  }
}
