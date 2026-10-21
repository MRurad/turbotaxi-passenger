import { isAxiosError, isCancel } from 'axios';

import type { TranslationKey } from '@/i18n/types';

export type ApiErrorCode =
  | 'network'
  | 'timeout'
  | 'invalidCredentials'
  | 'sessionExpired'
  | 'forbidden'
  | 'notFound'
  | 'badRequest'
  | 'server'
  | 'envelope' // HTTP 200 with { success: false, message }
  | 'invalidResponse' // response is missing fields the app needs
  | 'notSupported' // feature needs a backend endpoint that doesn't exist yet
  | 'cancelled' // request aborted by the app; ignore, don't display
  | 'unknown';

/** i18n key shown for each code when the server gives no usable message. */
export const API_ERROR_MESSAGE_KEYS: Readonly<Record<ApiErrorCode, TranslationKey>> = {
  network: 'errors.network',
  timeout: 'errors.timeout',
  invalidCredentials: 'errors.invalidCredentials',
  sessionExpired: 'errors.sessionExpired',
  forbidden: 'errors.forbidden',
  notFound: 'errors.notFound',
  badRequest: 'errors.badRequest',
  server: 'errors.server',
  envelope: 'errors.unknown',
  invalidResponse: 'errors.unknown',
  notSupported: 'errors.notSupported',
  cancelled: 'errors.unknown',
  unknown: 'errors.unknown',
};

interface ApiErrorInit {
  code: ApiErrorCode;
  status?: number;
  /** Message from the backend (may be in any language); prefer the i18n key for display. */
  serverMessage?: string;
  /** Field errors from ASP.NET ProblemDetails, if any. */
  details?: Readonly<Record<string, string[]>>;
  cause?: unknown;
}

/** The only error type hooks and screens ever see. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly serverMessage?: string;
  readonly details?: Readonly<Record<string, string[]>>;
  readonly messageKey: TranslationKey;

  constructor({ code, status, serverMessage, details, cause }: ApiErrorInit) {
    super(serverMessage ?? code, { cause });
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.serverMessage = serverMessage;
    this.details = details;
    this.messageKey = API_ERROR_MESSAGE_KEYS[code];
  }
}

const TIMEOUT_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT']);

function codeForStatus(status: number): ApiErrorCode {
  if (status === 400 || status === 422) return 'badRequest';
  if (status === 401) return 'sessionExpired';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'server';
  return 'unknown';
}

type FieldErrors = Record<string, string[]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Pulls a human message from `{ message }`, ProblemDetails `{ title, detail }` or a text body. */
function extractServerMessage(data: unknown): string | undefined {
  if (typeof data === 'string') return data.trim() || undefined;
  if (!isRecord(data)) return undefined;
  for (const field of ['message', 'detail', 'title']) {
    const value = data[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function extractFieldErrors(data: unknown): FieldErrors | undefined {
  if (!isRecord(data) || !isRecord(data.errors)) return undefined;
  const entries = Object.entries(data.errors).filter(
    (entry): entry is [string, string[]] =>
      Array.isArray(entry[1]) && entry[1].every((m) => typeof m === 'string'),
  );
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** Normalizes anything thrown by axios, an envelope check or a mapper into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  // Aborted by us (TanStack Query unmount/refetch): not a connectivity problem, never shown.
  if (isCancel(error)) return new ApiError({ code: 'cancelled', cause: error });

  if (isAxiosError(error)) {
    if (error.code && TIMEOUT_CODES.has(error.code))
      return new ApiError({ code: 'timeout', cause: error });
    const response = error.response;
    // No response at all: offline, DNS, TLS, server unreachable.
    if (!response) return new ApiError({ code: 'network', cause: error });
    return new ApiError({
      code: codeForStatus(response.status),
      status: response.status,
      serverMessage: extractServerMessage(response.data),
      details: extractFieldErrors(response.data),
      cause: error,
    });
  }

  return new ApiError({ code: 'unknown', cause: error });
}

interface Envelope<T> {
  success?: boolean;
  message?: string | null;
  data?: T;
}

/**
 * Unwraps the `{ success, message, data }` envelope used by Auth and Routes.
 * Also rejects null/empty bodies (e.g. a 204) with an ApiError instead of a TypeError.
 */
export function unwrapEnvelope<T>(envelope: Envelope<T> | null | undefined): T {
  if (
    typeof envelope !== 'object' ||
    envelope === null ||
    envelope.success !== true ||
    envelope.data == null
  ) {
    const message =
      typeof envelope === 'object' && envelope !== null ? envelope.message : undefined;
    throw new ApiError({
      code: 'envelope',
      serverMessage: typeof message === 'string' && message.trim() ? message.trim() : undefined,
    });
  }
  return envelope.data;
}
