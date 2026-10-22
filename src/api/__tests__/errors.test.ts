import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { ApiError, isRetryableError, toApiError, unwrapEnvelope } from '@/api/errors';

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

describe('toApiError (branches)', () => {
  it('maps ETIMEDOUT to timeout', () => {
    expect(toApiError(new AxiosError('t', 'ETIMEDOUT', requestConfig, {})).code).toBe('timeout');
  });

  it('maps HTTP 422 to badRequest', () => {
    expect(toApiError(httpError(422, null)).code).toBe('badRequest');
  });

  it('keeps the envelope message of a 4xx { success:false } body', () => {
    const error = toApiError(httpError(409, { success: false, message: '  Already taken  ' }));

    expect(error.envelopeMessage).toBe('Already taken');
    expect(error.serverMessage).toBe('Already taken');
  });

  it('drops the envelope message of a 5xx body (internal exception text)', () => {
    const error = toApiError(httpError(500, { success: false, message: 'NullReferenceException' }));

    expect(error.envelopeMessage).toBeUndefined();
    expect(error.serverMessage).toBe('NullReferenceException');
  });

  it('ignores a message when the body is not a { success:false } envelope', () => {
    expect(toApiError(httpError(400, { message: 'Bad' })).envelopeMessage).toBeUndefined();
  });

  it('ignores a blank or non-string envelope message', () => {
    expect(toApiError(httpError(400, { success: false, message: '  ' })).envelopeMessage).toBe(
      undefined,
    );
    expect(toApiError(httpError(400, { success: false, message: 5 })).envelopeMessage).toBe(
      undefined,
    );
  });

  it('prefers ProblemDetails detail over title', () => {
    const error = toApiError(httpError(400, { title: 'Bad Request', detail: 'Email is invalid' }));

    expect(error.serverMessage).toBe('Email is invalid');
  });

  it('leaves serverMessage undefined for a blank text body or a non-object body', () => {
    expect(toApiError(httpError(500, '   ')).serverMessage).toBeUndefined();
    expect(toApiError(httpError(500, 42)).serverMessage).toBeUndefined();
  });

  it('drops field errors when none of them is a list of strings', () => {
    expect(toApiError(httpError(400, { errors: { Email: [1, 2] } })).details).toBeUndefined();
    expect(toApiError(httpError(400, { errors: 'oops' })).details).toBeUndefined();
  });

  it('uses the code as message and the i18n key for the code', () => {
    const error = new ApiError({ code: 'notSupported' });

    expect(error.message).toBe('notSupported');
    expect(error.name).toBe('ApiError');
    expect(error.messageKey).toBe('errors.notSupported');
  });

  it('wraps a non-Error throw as unknown', () => {
    expect(toApiError('boom').code).toBe('unknown');
  });
});

describe('unwrapEnvelope (branches)', () => {
  it('throws without a message when success:false has a blank message', () => {
    const error = (() => {
      try {
        unwrapEnvelope({ success: false, message: '  ' });
      } catch (e) {
        return e;
      }
      return null;
    })();

    expect(error).toMatchObject({ code: 'envelope', serverMessage: undefined });
  });

  it('throws when success is missing even if data is present', () => {
    expect(() => unwrapEnvelope({ data: { a: 1 } })).toThrow(
      expect.objectContaining({ code: 'envelope' }),
    );
  });

  it('rejects a non-object body such as an empty string', () => {
    expect(() => unwrapEnvelope('' as unknown as null)).toThrow(
      expect.objectContaining({ code: 'envelope' }),
    );
  });

  it('returns falsy-but-present data such as 0', () => {
    expect(unwrapEnvelope({ success: true, data: 0 })).toBe(0);
  });
});

describe('isRetryableError', () => {
  it.each(['network', 'timeout', 'server', 'unknown'] as const)('retries %s', (code) => {
    expect(isRetryableError(new ApiError({ code }))).toBe(true);
  });

  it.each([
    'badRequest',
    'sessionExpired',
    'invalidCredentials',
    'forbidden',
    'notFound',
    'envelope',
    'invalidResponse',
    'notSupported',
    'cancelled',
  ] as const)('does not retry %s', (code) => {
    expect(isRetryableError(new ApiError({ code }))).toBe(false);
  });

  it('retries anything that is not an ApiError', () => {
    expect(isRetryableError(new Error('x'))).toBe(true);
  });
});
