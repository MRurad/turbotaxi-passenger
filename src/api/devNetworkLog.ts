import {
  AxiosHeaders,
  isAxiosError,
  isCancel,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { logger } from '@/lib/logger';

/**
 * DEV ONLY. In-memory HTTP log for the in-app inspector (/dev/realtime → Network) and a
 * one-line Console summary per request. Expo Go has no working Network tab. Only ever loaded
 * through `if (__DEV__) require(...)`, which Metro strips from release bundles.
 */

export const NETWORK_LOG_MAX_ENTRIES = 100;
export const NETWORK_LOG_MAX_BODY_CHARS = 2048;
export const MASKED = '***';

/**
 * Body / query fields whose values are never shown. Compared after lower-casing and dropping
 * "_" / "-", so access_token, refresh-token, AccessToken… all match.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'accesstoken',
  'refreshtoken',
  'token',
  'idtoken',
  'jwt',
  'apikey',
]);
/** Query params: the above plus Google's `key`. */
const SENSITIVE_PARAMS = new Set([...SENSITIVE_FIELDS, 'key']);
const SENSITIVE_HEADERS = new Set(['authorization', 'x-goog-api-key']);
/** Non-JSON bodies (e.g. form-encoded): password=…, *token=…, key=…. */
const SENSITIVE_PAIR = /\b(password|[a-z_-]*token|jwt|api_?key|key)=[^&\s]*/gi;
export const JSON_INDENT = 2;
/** Shown instead of a status when no response arrived. */
export const NO_STATUS = 'ERR';

const normalizeName = (name: string) => name.toLowerCase().replace(/[_-]/g, '');

export type NetworkSource = 'api' | 'google';

export interface NetworkLogEntry {
  id: number;
  source: NetworkSource;
  method: string;
  /** Path + query, secrets masked. */
  url: string;
  /** Null when no response arrived (network error, timeout, cancel). */
  status: number | null;
  durationMs: number | null;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseBody: string | null;
  error: string | null;
  /** Epoch ms when the request was sent. */
  timestamp: number;
}

export const isErrorEntry = (entry: NetworkLogEntry): boolean =>
  entry.error !== null || entry.status === null || entry.status >= 400;

// ── Masking / formatting (pure) ───────────────────────────────────────────────────────────

/** Deep copy with password / token fields replaced by ***. */
export function maskBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskBody);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key,
      SENSITIVE_FIELDS.has(normalizeName(key)) ? MASKED : maskBody(inner),
    ]),
  );
}

export function maskHeaders(headers: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([name, value]) => [
        name,
        SENSITIVE_HEADERS.has(name.toLowerCase()) ? MASKED : String(value),
      ]),
  );
}

export function truncate(text: string, max = NETWORK_LOG_MAX_BODY_CHARS): string {
  return text.length <= max ? text : `${text.slice(0, max)}… (+${text.length - max} chars)`;
}

const maskParam = (name: string, value: string) =>
  SENSITIVE_PARAMS.has(normalizeName(name)) ? MASKED : value;

/** "https://host/a/b?key=SECRET" + { q: 1 } → "/a/b?key=***&q=1". */
export function formatUrl(url: string | undefined, params?: unknown): string {
  const [rawPath = '', rawQuery = ''] = (url ?? '').replace(/^[a-z]+:\/\/[^/]+/i, '').split('?');
  const pairs = rawQuery
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [name = '', value = ''] = pair.split('=');
      return `${name}=${maskParam(name, value)}`;
    });
  if (params && typeof params === 'object') {
    for (const [name, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      pairs.push(`${name}=${encodeURIComponent(maskParam(name, String(value)))}`);
    }
  }
  const path = rawPath || '/';
  return pairs.length ? `${path}?${pairs.join('&')}` : path;
}

/** Pretty JSON (masked) or the raw text, truncated; null when there is no body. */
export function formatBody(data: unknown): string | null {
  if (data === undefined || data === null || data === '') return null;
  let value: unknown = data;
  if (typeof data === 'string') {
    try {
      value = JSON.parse(data);
    } catch {
      return truncate(data.replace(SENSITIVE_PAIR, (_match, name: string) => `${name}=${MASKED}`));
    }
  }
  try {
    return truncate(JSON.stringify(maskBody(value), null, JSON_INDENT));
  } catch {
    return truncate(String(value));
  }
}

// ── Ring buffer store ─────────────────────────────────────────────────────────────────────

let entries: readonly NetworkLogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const networkLog = {
  /** Newest first. Stable reference between changes (useSyncExternalStore-friendly). */
  getEntries: (): readonly NetworkLogEntry[] => entries,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  add(entry: Omit<NetworkLogEntry, 'id'>): void {
    if (!__DEV__) return;
    entries = [{ ...entry, id: nextId++ }, ...entries].slice(0, NETWORK_LOG_MAX_ENTRIES);
    emit();
  },
  clear(): void {
    entries = [];
    emit();
  },
};

// ── Axios hook-up ─────────────────────────────────────────────────────────────────────────

interface Outcome {
  status: number | null;
  data: unknown;
  error: string | null;
  /** Aborted by the app (e.g. TanStack Query): logged, but not as a failure. */
  cancelled?: boolean;
}

function record(
  source: NetworkSource,
  config: InternalAxiosRequestConfig,
  startedAt: number | undefined,
  outcome: Outcome,
): void {
  const now = Date.now();
  const entry: Omit<NetworkLogEntry, 'id'> = {
    source,
    method: (config.method ?? 'get').toUpperCase(),
    url: formatUrl(config.url, config.params),
    status: outcome.status,
    durationMs: startedAt === undefined ? null : now - startedAt,
    requestHeaders: maskHeaders(AxiosHeaders.from(config.headers).toJSON()),
    requestBody: formatBody(config.data),
    responseBody: formatBody(outcome.data),
    error: outcome.error,
    timestamp: startedAt ?? now,
  };
  networkLog.add(entry);
  // Console: path only — queries can carry PII (Google's latlng / address / input).
  const failed = !outcome.cancelled && isErrorEntry({ ...entry, id: 0 });
  const marker = outcome.cancelled ? '⊘' : failed ? '✖' : '→';
  const consolePath = entry.url.split('?')[0];
  const line = `${marker} ${entry.method} ${consolePath} ${entry.status ?? NO_STATUS} ${
    entry.durationMs ?? '?'
  }ms${entry.error ? ` (${entry.error})` : ''}`;
  if (failed) logger.warn(line);
  else logger.info(line);
}

/** Logging must never affect the request it observes. */
function safeRecord(...args: Parameters<typeof record>): void {
  try {
    record(...args);
  } catch {
    // Ignore: a formatting problem in the dev log is not the request's problem.
  }
}

/**
 * Register on an axios instance BEFORE its other interceptors: request interceptors run in
 * reverse order (so this one sees the final headers right before sending) and response ones
 * in order (so this one sees the raw response / axios error).
 */
export function attachNetworkLogger(instance: AxiosInstance, source: NetworkSource): void {
  if (!__DEV__) return;
  const startedAt = new WeakMap<InternalAxiosRequestConfig, number>();
  instance.interceptors.request.use((config) => {
    startedAt.set(config, Date.now());
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      safeRecord(source, response.config, startedAt.get(response.config), {
        status: response.status,
        data: response.data,
        error: null,
      });
      return response;
    },
    (error: unknown) => {
      // No config = an earlier interceptor failed before sending; nothing to show.
      const config = isAxiosError(error) ? error.config : undefined;
      if (config) {
        safeRecord(source, config, startedAt.get(config), {
          status: isAxiosError(error) ? (error.response?.status ?? null) : null,
          data: isAxiosError(error) ? error.response?.data : undefined,
          error: error instanceof Error ? error.message : String(error),
          cancelled: isCancel(error),
        });
      }
      return Promise.reject(error);
    },
  );
}
