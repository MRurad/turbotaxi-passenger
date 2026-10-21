import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { ApiError, toApiError } from '@/api/errors';
import { authErrorMessage, fieldErrorText } from '@/features/auth/utils/errors';
import { i18n } from '@/i18n';

const t = i18n.t.bind(i18n);
const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

function httpError(status: number, data: unknown) {
  return new AxiosError(
    'fail',
    'ERR_BAD_RESPONSE',
    config,
    {},
    {
      status,
      statusText: '',
      data,
      headers: {},
      config,
    },
  );
}

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('authErrorMessage', () => {
  it('shows the envelope message from an HTTP 200 { success:false }', () => {
    const error = new ApiError({ code: 'envelope', envelopeMessage: 'Email already registered' });
    expect(authErrorMessage(error, t)).toBe('Email already registered');
  });

  it('shows the envelope message from an error status body', () => {
    const error = toApiError(httpError(400, { success: false, message: 'Phone already used' }));
    expect(authErrorMessage(error, t)).toBe('Phone already used');
  });

  it('does not show ProblemDetails titles; falls back to the translated message', () => {
    const error = toApiError(httpError(400, { title: 'One or more validation errors occurred.' }));
    expect(error.envelopeMessage).toBeUndefined();
    expect(authErrorMessage(error, t)).toBe(t('errors.badRequest'));
  });

  it('translates when there is no server message', () => {
    expect(authErrorMessage(new ApiError({ code: 'invalidCredentials' }), t)).toBe(
      'Wrong email or password.',
    );
    expect(authErrorMessage(new ApiError({ code: 'network' }), t)).toBe(t('errors.network'));
    expect(authErrorMessage(new Error('boom'), t)).toBe(t('errors.unknown'));
  });

  it('ignores an empty envelope message', () => {
    const error = toApiError(httpError(400, { success: false, message: '   ' }));
    expect(authErrorMessage(error, t)).toBe(t('errors.badRequest'));
  });
});

describe('fieldErrorText', () => {
  it('translates zod keys with the password-length count', () => {
    expect(fieldErrorText(t, 'errors.validation.minLength')).toBe('Must be at least 6 characters');
    expect(fieldErrorText(t, 'errors.validation.email')).toBe('Enter a valid email address');
    expect(fieldErrorText(t, undefined)).toBeUndefined();
  });
});

describe('envelope messages from 5xx', () => {
  it('are never shown (likely internal exception text)', () => {
    const error = toApiError(
      httpError(500, { success: false, message: 'Object reference not set to an instance' }),
    );
    expect(error.envelopeMessage).toBeUndefined();
    expect(authErrorMessage(error, t)).toBe(t('errors.server'));
  });
});
