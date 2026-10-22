import {
  HttpError,
  HttpTransportType,
  HubConnectionState,
  LogLevel,
  NullLogger,
  type IHubProtocol,
  type ILogger,
  type IRetryPolicy,
} from '@microsoft/signalr';

import { useRealtimeDebug } from '@/realtime/debugLog';
import { USER_HUB_EVENTS, USER_HUB_SCHEMAS, type UserHubEventMap } from '@/realtime/events';
import {
  HubConnectionManager,
  ON_CONNECT_MAX_ATTEMPTS,
  retryDelay,
  type HubManagerOptions,
  type HubState,
} from '@/realtime/HubConnectionManager';

// ── Stateful fake of @microsoft/signalr's HubConnection ──────────────────────────────────────

interface FakeConnection {
  state: HubConnectionState;
  urlOptions: Record<string, unknown>;
  protocol: IHubProtocol | null;
  reconnectPolicy: IRetryPolicy | null;
  logging: ILogger | LogLevel | null;
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
  invoke: jest.Mock<Promise<unknown>, unknown[]>;
  emit: (event: string, ...args: unknown[]) => void;
  reconnecting: () => void;
  reconnected: () => void;
  /** Server-side drop (fires onclose like SignalR does). */
  drop: () => void;
}

const mockConnections: FakeConnection[] = [];
/** Outcomes for the next start() calls: 'ok' | 'fail' | an Error to reject with. */
let mockStartResults: ('ok' | 'fail' | Error)[] = [];

jest.mock('@microsoft/signalr', () => {
  const actual = jest.requireActual('@microsoft/signalr');
  const S = actual.HubConnectionState;
  class FakeBuilder {
    private urlOptions: Record<string, unknown> = {};
    private protocol: IHubProtocol | null = null;
    private reconnectPolicy: IRetryPolicy | null = null;
    private logging: ILogger | LogLevel | null = null;
    withUrl(_url: string, options: Record<string, unknown>) {
      this.urlOptions = options;
      return this;
    }
    withAutomaticReconnect(policy: IRetryPolicy) {
      this.reconnectPolicy = policy;
      return this;
    }
    withHubProtocol(protocol: IHubProtocol) {
      this.protocol = protocol;
      return this;
    }
    configureLogging(logging: ILogger | LogLevel) {
      this.logging = logging;
      return this;
    }
    build() {
      const handlers = new Map<string, ((...args: unknown[]) => void)[]>();
      const cb = { reconnecting: () => {}, reconnected: () => {}, close: () => {} };
      const connection: Record<string, unknown> = {
        state: S.Disconnected,
        urlOptions: this.urlOptions,
        protocol: this.protocol,
        reconnectPolicy: this.reconnectPolicy,
        logging: this.logging,
        on: (event: string, fn: (...args: unknown[]) => void) =>
          handlers.set(event, [...(handlers.get(event) ?? []), fn]),
        onreconnecting: (fn: () => void) => (cb.reconnecting = fn),
        onreconnected: (fn: () => void) => (cb.reconnected = fn),
        onclose: (fn: () => void) => (cb.close = fn),
        emit: (event: string, ...args: unknown[]) =>
          handlers.get(event)?.forEach((fn) => fn(...args)),
        reconnecting: () => {
          connection.state = S.Reconnecting;
          cb.reconnecting();
        },
        reconnected: () => {
          connection.state = S.Connected;
          cb.reconnected();
        },
        drop: () => {
          connection.state = S.Disconnected;
          cb.close();
        },
      };
      connection.start = jest.fn(async () => {
        // Same rule as SignalR: only from Disconnected.
        if (connection.state !== S.Disconnected) {
          throw new Error("Cannot start a HubConnection that is not in the 'Disconnected' state.");
        }
        connection.state = S.Connecting;
        await Promise.resolve();
        const outcome = mockStartResults.shift() ?? 'ok';
        if (outcome !== 'ok') {
          connection.state = S.Disconnected;
          throw outcome === 'fail' ? new Error('refused') : outcome;
        }
        connection.state = S.Connected;
      });
      // Async like the real one: Disconnecting for a tick, then Disconnected + onclose.
      connection.stop = jest.fn(async () => {
        if (connection.state === S.Disconnected) return;
        connection.state = S.Disconnecting;
        await new Promise((resolve) => setTimeout(resolve, 0));
        connection.state = S.Disconnected;
        cb.close();
      });
      connection.invoke = jest.fn(() => Promise.resolve('ok'));
      mockConnections.push(connection as unknown as FakeConnection);
      return connection;
    }
  }
  return { ...actual, HubConnectionBuilder: FakeBuilder };
});

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));
const last = () => mockConnections[mockConnections.length - 1] as FakeConnection;

function makeHub(overrides: Partial<HubManagerOptions<UserHubEventMap>> = {}) {
  const hub = new HubConnectionManager<UserHubEventMap>({
    hub: 'user',
    url: 'https://api.test/hubs/user',
    schemas: USER_HUB_SCHEMAS,
    accessTokenFactory: () => 'jwt',
    ...overrides,
  });
  const states: HubState[] = [];
  hub.subscribe((s) => states.push(s));
  return { hub, states };
}

beforeEach(() => {
  mockConnections.length = 0;
  mockStartResults = [];
  useRealtimeDebug.getState().clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────────────────────

describe('HubConnectionManager — basics', () => {
  it('connects over WebSockets with the JWT and runs on-connect actions', async () => {
    const { hub, states } = makeHub();
    const onConnect = jest.fn();
    hub.addOnConnect(onConnect);

    await hub.start();
    await flush();

    expect(last().urlOptions).toMatchObject({
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true,
    });
    expect((last().urlOptions.accessTokenFactory as () => string)()).toBe('jwt');
    expect(states).toEqual(['connecting', 'connected']);
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('is idempotent and runs an action added while connected right away', async () => {
    const { hub } = makeHub();
    await Promise.all([hub.start(), hub.start()]);
    expect(mockConnections).toHaveLength(1);
    expect(last().start).toHaveBeenCalledTimes(1);

    const late = jest.fn();
    hub.addOnConnect(late);
    await flush();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('delivers validated payloads, drops invalid ones, and unsubscribes', async () => {
    const { hub } = makeHub();
    const handler = jest.fn();
    const off = hub.on(USER_HUB_EVENTS.driverLocationUpdated, handler);
    await hub.start();

    // Positional arguments, as the server sends them.
    last().emit(USER_HUB_EVENTS.driverLocationUpdated, 3, 40.4, 49.8);
    last().emit(USER_HUB_EVENTS.driverLocationUpdated, { driverId: 3, latitude: 1, longitude: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ driverId: 3, latitude: 40.4, longitude: 49.8 });

    off();
    last().emit(USER_HUB_EVENTS.driverLocationUpdated, 3, 1, 2);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('one throwing handler does not stop the others', async () => {
    const { hub } = makeHub();
    const good = jest.fn();
    hub.on(USER_HUB_EVENTS.rideStatusUpdated, () => {
      throw new Error('boom');
    });
    hub.on(USER_HUB_EVENTS.rideStatusUpdated, good);
    await hub.start();
    last().emit(USER_HUB_EVENTS.rideStatusUpdated, 1, 'ride_update', { status: 'Searching' });
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('the same function registered twice needs two unsubscribes', async () => {
    const { hub } = makeHub();
    const handler = jest.fn();
    const offA = hub.on(USER_HUB_EVENTS.rideStatusUpdated, handler);
    hub.on(USER_HUB_EVENTS.rideStatusUpdated, handler);
    await hub.start();
    offA();
    last().emit(USER_HUB_EVENTS.rideStatusUpdated, 1, 'ride_update', { status: 'Searching' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('invoke forwards when connected and rejects otherwise', async () => {
    const { hub } = makeHub();
    await expect(hub.invoke('Ping')).rejects.toThrow(/not connected/);
    await hub.start();
    await expect(hub.invoke('SubscribeToDriverLocation', 7)).resolves.toBe('ok');
    expect(last().invoke).toHaveBeenCalledWith('SubscribeToDriverLocation', 7);
  });
});

describe('HubConnectionManager — reconnect & retries', () => {
  it('re-runs on-connect actions after a reconnect (groups are lost)', async () => {
    const { hub, states } = makeHub();
    const subscribe = jest.fn();
    hub.addOnConnect(subscribe);
    await hub.start();
    await flush();

    last().reconnecting();
    expect(hub.getState()).toBe('reconnecting');
    await hub.start(); // must not call connection.start() during automatic reconnect
    expect(last().start).toHaveBeenCalledTimes(1);

    last().reconnected();
    await flush();
    expect(states.slice(-2)).toEqual(['reconnecting', 'connected']);
    expect(subscribe).toHaveBeenCalledTimes(2);
  });

  it('falls back to negotiation once, then retries with the backoff table', async () => {
    jest.useFakeTimers();
    mockStartResults = ['fail', 'fail', 'ok'];
    const { hub } = makeHub();

    await hub.start();
    expect(mockConnections).toHaveLength(2);
    expect(mockConnections[1]?.urlOptions.skipNegotiation).toBe(false);
    expect(hub.getState()).toBe('disconnected');

    await jest.advanceTimersByTimeAsync(retryDelay(1));
    expect(hub.getState()).toBe('connected');
  });

  it('keeps retrying after the server drops the connection', async () => {
    jest.useFakeTimers();
    const { hub } = makeHub();
    await hub.start();

    last().drop();
    expect(hub.getState()).toBe('disconnected');
    await jest.advanceTimersByTimeAsync(retryDelay(0));
    expect(last().start).toHaveBeenCalledTimes(2);
    expect(hub.getState()).toBe('connected');
  });

  it('retries a failing on-connect action, then forces a reconnect', async () => {
    jest.useFakeTimers();
    const { hub } = makeHub();
    const action = jest.fn().mockRejectedValue(new Error('not in group'));
    hub.addOnConnect(action);
    await hub.start();
    await jest.advanceTimersByTimeAsync(0);

    for (let attempt = 1; attempt < ON_CONNECT_MAX_ATTEMPTS; attempt += 1) {
      await jest.advanceTimersByTimeAsync(retryDelay(attempt));
    }
    expect(action).toHaveBeenCalledTimes(ON_CONNECT_MAX_ATTEMPTS);
    // Gave up on this socket: stop() → onclose → disconnected → scheduled reconnect.
    await jest.advanceTimersByTimeAsync(1);
    expect(last().stop).toHaveBeenCalled();
  });
});

describe('HubConnectionManager — stop/start races', () => {
  it('stop() then start() back to back ends connected, same connection, still skipNegotiation', async () => {
    const { hub } = makeHub();
    await hub.start();

    const stopping = hub.stop();
    const starting = hub.start();
    await Promise.all([stopping, starting]);
    await flush();

    expect(hub.getState()).toBe('connected');
    expect(mockConnections).toHaveLength(1);
    expect(last().urlOptions.skipNegotiation).toBe(true);
    expect(last().state).toBe(HubConnectionState.Connected);
  });

  it('ignores the late onclose that our own stop() causes', async () => {
    jest.useFakeTimers();
    const { hub } = makeHub();
    await hub.start();
    const stopping = hub.stop(); // the fake's stop() resolves on a timer, then fires onclose
    await jest.advanceTimersByTimeAsync(1);
    await stopping;
    await jest.advanceTimersByTimeAsync(retryDelay(10));
    expect(hub.getState()).toBe('idle');
    expect(last().start).toHaveBeenCalledTimes(1);
  });

  it('ignores callbacks from a replaced connection', async () => {
    mockStartResults = ['fail', 'ok']; // first build fails → negotiate rebuild
    const { hub } = makeHub();
    await hub.start();
    const [old] = mockConnections;
    expect(hub.getState()).toBe('connected');

    old?.drop();
    old?.reconnecting();
    expect(hub.getState()).toBe('connected');
  });

  it('reset() forgets on-connect actions (logout)', async () => {
    const { hub } = makeHub();
    const action = jest.fn();
    hub.addOnConnect(action);
    await hub.start();
    await flush();
    await hub.reset();
    await hub.start();
    await flush();
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('HubConnectionManager — session', () => {
  it('does not connect without a valid session and reports it', async () => {
    const onSessionInvalid = jest.fn();
    const { hub } = makeHub({ isSessionValid: () => false, onSessionInvalid });
    await hub.start();
    expect(mockConnections).toHaveLength(0);
    expect(hub.getState()).toBe('idle');
    expect(onSessionInvalid).toHaveBeenCalledTimes(1);
  });

  it('a 401 from the hub ends the session instead of retrying forever', async () => {
    jest.useFakeTimers();
    mockStartResults = [new Error('Unauthorized: 401')];
    const onSessionInvalid = jest.fn();
    const { hub } = makeHub({ onSessionInvalid });
    await hub.start();
    expect(onSessionInvalid).toHaveBeenCalledTimes(1);
    expect(hub.getState()).toBe('idle');
    await jest.advanceTimersByTimeAsync(retryDelay(10));
    expect(last().start).toHaveBeenCalledTimes(1);
  });
});

describe('catch-all + retry table', () => {
  it('records every invocation and flags unknown event names', async () => {
    const { hub } = makeHub();
    await hub.start();
    const frame = (target: string) =>
      `${JSON.stringify({ type: 1, target, arguments: [{ rideId: 5 }] })}\u001e`;

    last().protocol?.parseMessages(frame('MysteryEvent'), NullLogger.instance);
    last().protocol?.parseMessages(frame('ridestatusupdated'), NullLogger.instance);

    const [second, first] = useRealtimeDebug.getState().events;
    expect(first).toMatchObject({
      hub: 'user',
      name: 'MysteryEvent',
      known: false,
      args: [{ rideId: 5 }],
    });
    // SignalR matches names case-insensitively; so does the catch-all.
    expect(second).toMatchObject({ name: 'ridestatusupdated', known: true });
  });

  it('retryDelay follows the table and then stays at the last delay forever', () => {
    expect(retryDelay(0)).toBe(0);
    expect(retryDelay(1)).toBe(2_000);
    expect(retryDelay(5)).toBe(30_000);
    expect(retryDelay(50)).toBe(30_000);
  });
});

describe('HubConnectionManager — automatic reconnect policy', () => {
  it("SignalR's automatic reconnect follows our backoff table", async () => {
    const { hub } = makeHub();
    await hub.start();

    const policy = last().reconnectPolicy;

    expect(policy?.nextRetryDelayInMilliseconds({ previousRetryCount: 1 } as never)).toBe(
      retryDelay(1),
    );
  });

  it('stops the automatic reconnect loop once the session is gone', async () => {
    let valid = true;
    const { hub } = makeHub({ isSessionValid: () => valid });
    await hub.start();
    valid = false;

    const delay = last().reconnectPolicy?.nextRetryDelayInMilliseconds({
      previousRetryCount: 0,
    } as never);

    expect(delay).toBeNull();
  });

  it('a drop with an expired session logs out instead of scheduling a retry', async () => {
    jest.useFakeTimers();
    let valid = true;
    const onSessionInvalid = jest.fn();
    const { hub } = makeHub({ isSessionValid: () => valid, onSessionInvalid });
    await hub.start();
    valid = false;

    last().drop();
    await jest.advanceTimersByTimeAsync(retryDelay(10));

    expect(onSessionInvalid).toHaveBeenCalledTimes(1);
    expect(hub.getState()).toBe('idle');
    expect(last().start).toHaveBeenCalledTimes(1);
  });

  it('a 401 HttpError ends the session whatever its message says', async () => {
    mockStartResults = [new HttpError('handshake rejected', 401)];
    const onSessionInvalid = jest.fn();
    const { hub } = makeHub({ onSessionInvalid });

    await hub.start();

    expect(onSessionInvalid).toHaveBeenCalledTimes(1);
    expect(mockConnections).toHaveLength(1);
  });

  it('a local abort does not trigger the negotiate fallback', async () => {
    const abort = new Error('The connection was stopped during negotiation.');
    abort.name = 'AbortError';
    mockStartResults = [abort];
    const { hub } = makeHub();

    await hub.start();

    expect(mockConnections).toHaveLength(1);
    expect(last().urlOptions.skipNegotiation).toBe(true);
    expect(hub.getState()).toBe('disconnected');
    await hub.stop();
  });
});

describe('HubConnectionManager — after stop()', () => {
  it('ignores reconnect callbacks and does not re-run actions once stopped', async () => {
    const { hub } = makeHub();
    const action = jest.fn();
    hub.addOnConnect(action);
    await hub.start();
    await flush();
    const connection = last();
    await hub.stop();

    connection.reconnecting();
    connection.reconnected();
    await flush();

    expect(hub.getState()).toBe('idle');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('a connect that completes after stop() is closed and never reports connected', async () => {
    const { hub, states } = makeHub();
    const action = jest.fn();
    hub.addOnConnect(action);

    const starting = hub.start();
    const stopping = hub.stop();
    await Promise.all([starting, stopping]);
    await flush();

    expect(states).not.toContain('connected');
    expect(hub.getState()).toBe('idle');
    expect(hub.wasWanted()).toBe(false);
    expect(action).not.toHaveBeenCalled();
  });

  it('does not retry a failing action that was removed in the meantime', async () => {
    jest.useFakeTimers();
    const { hub } = makeHub();
    let reject: (error: Error) => void = () => undefined;
    const action = jest.fn(() => new Promise((_resolve, fail) => (reject = fail)));
    const remove = hub.addOnConnect(action);
    await hub.start();
    await jest.advanceTimersByTimeAsync(0);

    remove();
    reject(new Error('not in group'));
    await jest.advanceTimersByTimeAsync(retryDelay(ON_CONNECT_MAX_ATTEMPTS));

    expect(action).toHaveBeenCalledTimes(1);
    expect(last().stop).not.toHaveBeenCalled();
    expect(hub.getState()).toBe('connected');
  });

  it('reports whether the app still wants the hub (restore after backgrounding)', async () => {
    const { hub } = makeHub();
    expect(hub.wasWanted()).toBe(false);

    await hub.start();
    expect(hub.wasWanted()).toBe(true);

    await hub.stop();
    expect(hub.wasWanted()).toBe(false);
  });
});

describe('HubConnectionManager — dev logging', () => {
  const warnings = () => jest.mocked(console.warn).mock.calls.map(([line]) => String(line));

  it('warns about an event name nobody handles', async () => {
    const { hub } = makeHub();
    await hub.start();
    const frame = `${JSON.stringify({ type: 1, target: 'RideTeleported', arguments: [] })}\u001e`;

    last().protocol?.parseMessages(frame, NullLogger.instance);

    expect(warnings().some((line) => line.includes('unknown user event "RideTeleported"'))).toBe(
      true,
    );
  });

  it('does not warn about a known event name', async () => {
    const { hub } = makeHub();
    await hub.start();
    const frame = `${JSON.stringify({
      type: 1,
      target: USER_HUB_EVENTS.driverLocationUpdated,
      arguments: [1, 2, 3],
    })}\u001e`;

    last().protocol?.parseMessages(frame, NullLogger.instance);

    expect(warnings().some((line) => line.includes('unknown'))).toBe(false);
  });

  it('forwards SignalR warnings and errors, drops its chatter', async () => {
    const { hub } = makeHub();
    await hub.start();
    const signalrLogger = last().logging as ILogger;

    signalrLogger.log(LogLevel.Information, 'connected to x');
    signalrLogger.log(LogLevel.Error, 'socket closed');

    expect(warnings().filter((line) => line.includes('signalr:'))).toEqual([
      '[turbotaxi] signalr: socket closed',
    ]);
  });

  it('drops an event that arrives with no handler registered without failing', async () => {
    const { hub } = makeHub();
    await hub.start();

    expect(() => last().emit(USER_HUB_EVENTS.driverLocationUpdated, 3, 1, 2)).not.toThrow();
  });
});
