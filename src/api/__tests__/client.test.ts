import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { useAuthStore } from '@/features/auth/store';
import { i18n } from '@/i18n';

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'test-key' },
}));

const initialState = useAuthStore.getState();
const seen: InternalAxiosRequestConfig[] = [];

/** Fake transport: records the request and answers with `status`. */
function respondWith(status: number, data: unknown = {}): AxiosAdapter {
  return async (config) => {
    seen.push(config);
    const response = { status, statusText: '', data, headers: {}, config };
    if (status >= 400) {
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    }
    return response;
  };
}

function signIn() {
  useAuthStore.setState({
    status: 'authenticated',
    accessToken: 'tok',
    user: { id: 7, name: '', surname: '', phoneNumber: '', email: '', createdAt: null },
  });
}

beforeEach(async () => {
  seen.length = 0;
  useAuthStore.setState(initialState, true);
  await i18n.changeLanguage('az');
});

// spyOn(getState(), 'logout') on the reset state patches `initialState` itself; restore it so
// call counts don't leak into later tests through every state copy.
afterEach(() => jest.restoreAllMocks());

describe('apiClient', () => {
  it('sends the Bearer token and Accept-Language', async () => {
    signIn();
    await i18n.changeLanguage('ru');
    apiClient.defaults.adapter = respondWith(200, { ok: true });

    await apiClient.get('/api/Users/7');

    expect(seen[0]?.baseURL).toBe('https://api.test');
    expect(seen[0]?.headers.Authorization).toBe('Bearer tok');
    expect(seen[0]?.headers['Accept-Language']).toBe('ru-RU');
  });

  it('omits Authorization when signed out', async () => {
    apiClient.defaults.adapter = respondWith(200);
    await apiClient.post('/api/Auth/login', {});
    expect(seen[0]?.headers.Authorization).toBeUndefined();
  });

  it('logs out once when parallel authenticated requests get 401', async () => {
    signIn();
    const logout = jest.spyOn(useAuthStore.getState(), 'logout');
    apiClient.defaults.adapter = respondWith(401);

    const results = await Promise.allSettled([apiClient.get('/a'), apiClient.get('/b')]);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledWith('expired');
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    for (const r of results) {
      expect(r.status).toBe('rejected');
      if (r.status === 'rejected') expect(r.reason).toMatchObject({ code: 'sessionExpired' });
    }
  });

  it('maps a 401 without a token (login) to invalidCredentials and does not log out', async () => {
    const logout = jest.spyOn(useAuthStore.getState(), 'logout');
    apiClient.defaults.adapter = respondWith(401, { message: 'Invalid' });

    await expect(apiClient.post('/api/Auth/login', {})).rejects.toMatchObject({
      code: 'invalidCredentials',
      serverMessage: 'Invalid',
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it.each([
    ['az', 'az-AZ'],
    ['en', 'en-US'],
  ] as const)('sends Accept-Language for %s as %s', async (language, tag) => {
    await i18n.changeLanguage(language);
    apiClient.defaults.adapter = respondWith(200);

    await apiClient.get('/x');

    expect(seen[0]?.headers['Accept-Language']).toBe(tag);
  });

  it('does not log out on a 403 for an authenticated request', async () => {
    signIn();
    const logout = jest.spyOn(useAuthStore.getState(), 'logout');
    apiClient.defaults.adapter = respondWith(403);

    await expect(apiClient.get('/x')).rejects.toMatchObject({ code: 'forbidden' });
    expect(logout).not.toHaveBeenCalled();
  });

  it('rejects with network and keeps the session when there is no response', async () => {
    signIn();
    const logout = jest.spyOn(useAuthStore.getState(), 'logout');
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    };

    await expect(apiClient.get('/x')).rejects.toMatchObject({ code: 'network' });
    expect(logout).not.toHaveBeenCalled();
  });

  it('always rejects with ApiError', async () => {
    apiClient.defaults.adapter = respondWith(500);
    await expect(apiClient.get('/x')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('stale 401s (request sent with an older token)', () => {
  /** Adapter that holds the response until `release()` is called. */
  function deferred401() {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const adapter: AxiosAdapter = async (config) => {
      seen.push(config);
      await gate;
      const response = { status: 401, statusText: '', data: {}, headers: {}, config };
      throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    };
    return { adapter, release };
  }

  it('does not log out a newer session', async () => {
    signIn(); // token "tok"
    const { adapter, release } = deferred401();
    apiClient.defaults.adapter = adapter;

    const pending = apiClient.get('/old');
    await Promise.resolve();
    useAuthStore.setState({ accessToken: 'new-token' }); // user logged in again meanwhile
    release();

    await expect(pending).rejects.toMatchObject({ code: 'sessionExpired' });
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'new-token',
    });
  });

  it('does not relabel a manual logout as expired', async () => {
    signIn();
    const { adapter, release } = deferred401();
    apiClient.defaults.adapter = adapter;

    const pending = apiClient.get('/old');
    await Promise.resolve();
    await useAuthStore.getState().logout('user');
    release();

    await expect(pending).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().lastLogoutReason).toBe('user');
  });

  it('treats a 401 from login as wrong credentials even while a session exists', async () => {
    signIn();
    const logout = jest.spyOn(useAuthStore.getState(), 'logout');
    apiClient.defaults.adapter = respondWith(401, { success: false, message: 'Wrong password' });

    await expect(apiClient.post('/api/Auth/login', {})).rejects.toMatchObject({
      code: 'invalidCredentials',
      status: 401,
      envelopeMessage: 'Wrong password',
    });
    expect(logout).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('never sends a token to login/register', async () => {
    signIn();
    apiClient.defaults.adapter = respondWith(200);
    await apiClient.post('/api/Auth/login', {});
    await apiClient.post('/api/Auth/register', {});
    expect(seen.map((c) => c.headers.Authorization)).toEqual([undefined, undefined]);
  });
});
