import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ApiError, toApiError, unwrapEnvelope } from '@/api/errors';

const requestConfig = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

function httpError(status: number, data: unknown): AxiosError {
  const response = {
    status,
    statusText: '',
    data,
    headers: {},
    config: requestConfig,
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', requestConfig, {}, response);
}

describe('toApiError', () => {
  it('maps a missing response to network', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', requestConfig, {}));
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('network');
    expect(error.messageKey).toBe('errors.network');
  });

  it('maps axios timeouts', () => {
    const error = toApiError(new AxiosError('timeout', 'ECONNABORTED', requestConfig, {}));
    expect(error.code).toBe('timeout');
    expect(error.messageKey).toBe('errors.timeout');
  });

  it.each([
    [400, 'badRequest'],
    [401, 'sessionExpired'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ] as const)('maps HTTP %i to %s', (status, code) => {
    const error = toApiError(httpError(status, null));
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });

  it('keeps the server message from { success:false, message }', () => {
    const error = toApiError(httpError(400, { success: false, message: 'Email already used' }));
    expect(error.serverMessage).toBe('Email already used');
  });

  it('reads ASP.NET ProblemDetails title and field errors', () => {
    const error = toApiError(
      httpError(400, {
        title: 'One or more validation errors occurred.',
        errors: { Email: ['The Email field is required.'], Bad: 'not-a-list' },
      }),
    );
    expect(error.serverMessage).toBe('One or more validation errors occurred.');
    expect(error.details).toEqual({ Email: ['The Email field is required.'] });
  });

  it('accepts a plain-text body', () => {
    expect(toApiError(httpError(500, 'Boom')).serverMessage).toBe('Boom');
  });

  it('passes ApiError through and wraps anything else as unknown', () => {
    const original = new ApiError({ code: 'forbidden' });
    expect(toApiError(original)).toBe(original);
    const wrapped = toApiError(new Error('weird'));
    expect(wrapped.code).toBe('unknown');
    expect(wrapped.messageKey).toBe('errors.unknown');
  });
});

describe('unwrapEnvelope', () => {
  it('returns data on success', () => {
    expect(unwrapEnvelope({ success: true, data: { a: 1 } })).toEqual({ a: 1 });
  });

  it('throws an envelope error with the server message on success:false', () => {
    expect(() => unwrapEnvelope({ success: false, message: 'User exists' })).toThrow(
      expect.objectContaining({ code: 'envelope', serverMessage: 'User exists' }),
    );
  });

  it('throws when success is true but data is missing', () => {
    expect(() => unwrapEnvelope({ success: true })).toThrow(ApiError);
  });
});

describe('review edge cases', () => {
  it('rejects a null/empty envelope with an ApiError, not a TypeError', () => {
    expect(() => unwrapEnvelope(null)).toThrow(expect.objectContaining({ code: 'envelope' }));
    expect(() => unwrapEnvelope(undefined)).toThrow(ApiError);
  });

  it('maps a cancelled request to cancelled, not network', () => {
    expect(toApiError(new CanceledError()).code).toBe('cancelled');
  });
});
