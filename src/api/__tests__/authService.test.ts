import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@/api/client';
import { register } from '@/api/services/auth';
import { ENDPOINTS } from '@/api/endpoints';

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'test-key' },
}));

const INPUT = {
  name: 'Rashad',
  surname: 'Mammadov',
  phoneNumber: '+994501234567',
  email: 'r@x.az',
  password: 'secret1',
};

const USER = { id: 7, name: 'Rashad', surname: 'Mammadov', email: 'r@x.az', phoneNumber: '+994' };
const LOGIN_OK = { success: true, data: { user: USER, tokens: { accessToken: 'login-token' } } };

/** Fake backend: answers per path, records requests. */
function backend(responses: Record<string, { status: number; data: unknown }>) {
  const calls: string[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(config.url ?? '');
    const r = responses[config.url ?? ''] ?? { status: 404, data: null };
    const response = { ...r, statusText: '', headers: {}, config };
    if (r.status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    return response;
  };
  apiClient.defaults.adapter = adapter;
  return calls;
}

describe('register', () => {
  // The fallback logs a dev warning by design; keep test output clean.
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('uses the session from the register response when it has one', async () => {
    const calls = backend({
      [ENDPOINTS.auth.register]: {
        status: 200,
        data: { success: true, data: { user: USER, tokens: { accessToken: 'reg-token' } } },
      },
    });
    const session = await register(INPUT);
    expect(session.tokens.accessToken).toBe('reg-token');
    expect(calls).toEqual([ENDPOINTS.auth.register]);
  });

  it.each([
    ['success without tokens', { success: true, message: 'Registered', data: { user: USER } }],
    ['success without user', { success: true, data: { tokens: { accessToken: 't' } } }],
    ['success without data', { success: true, message: 'User created' }],
    ['a plain user object (no envelope)', USER],
    ['an empty body', ''],
  ])('falls back to login on 200 with %s', async (_label, registerBody) => {
    const calls = backend({
      [ENDPOINTS.auth.register]: { status: 200, data: registerBody },
      [ENDPOINTS.auth.login]: { status: 200, data: LOGIN_OK },
    });
    const session = await register(INPUT);
    expect(session.tokens.accessToken).toBe('login-token');
    expect(session.user.id).toBe(7);
    expect(calls).toEqual([ENDPOINTS.auth.register, ENDPOINTS.auth.login]);
  });

  it('does not log in when the server says success:false', async () => {
    const calls = backend({
      [ENDPOINTS.auth.register]: {
        status: 200,
        data: { success: false, message: 'Email already registered' },
      },
      [ENDPOINTS.auth.login]: { status: 200, data: LOGIN_OK },
    });
    await expect(register(INPUT)).rejects.toMatchObject({
      code: 'envelope',
      envelopeMessage: 'Email already registered',
    });
    expect(calls).toEqual([ENDPOINTS.auth.register]);
  });

  it('surfaces a 4xx register error without logging in', async () => {
    const calls = backend({
      [ENDPOINTS.auth.register]: {
        status: 400,
        data: { success: false, message: 'Phone already used' },
      },
    });
    await expect(register(INPUT)).rejects.toMatchObject({ envelopeMessage: 'Phone already used' });
    expect(calls).toEqual([ENDPOINTS.auth.register]);
  });
});
