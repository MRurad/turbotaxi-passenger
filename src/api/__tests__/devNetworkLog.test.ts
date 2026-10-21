import { AxiosError, create, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import {
  MASKED,
  NETWORK_LOG_MAX_BODY_CHARS,
  NETWORK_LOG_MAX_ENTRIES,
  attachNetworkLogger,
  formatBody,
  formatUrl,
  isErrorEntry,
  maskBody,
  maskHeaders,
  networkLog,
  truncate,
  type NetworkLogEntry,
} from '@/api/devNetworkLog';

import { logger } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const entry = (overrides: Partial<Omit<NetworkLogEntry, 'id'>> = {}) => ({
  source: 'api' as const,
  method: 'GET',
  url: '/api/x',
  status: 200,
  durationMs: 10,
  requestHeaders: {},
  requestBody: null,
  responseBody: null,
  error: null,
  timestamp: 0,
  ...overrides,
});

beforeEach(() => networkLog.clear());

describe('masking', () => {
  it('masks password and token fields at any depth, case-insensitively', () => {
    expect(
      maskBody({
        email: 'a@b.c',
        Password: 'secret',
        data: { tokens: [{ accessToken: 'jwt', refreshToken: 'r', expiresIn: 3600 }] },
        token: 't',
      }),
    ).toEqual({
      email: 'a@b.c',
      Password: MASKED,
      data: { tokens: [{ accessToken: MASKED, refreshToken: MASKED, expiresIn: 3600 }] },
      token: MASKED,
    });
  });

  it('masks other token spellings and secrets in non-JSON bodies', () => {
    expect(
      maskBody({ access_token: 'a', 'refresh-token': 'r', idToken: 'i', apiKey: 'k' }),
    ).toEqual({ access_token: MASKED, 'refresh-token': MASKED, idToken: MASKED, apiKey: MASKED });
    expect(formatBody('email=a&password=secret&access_token=jwt')).toBe(
      `email=a&password=${MASKED}&access_token=${MASKED}`,
    );
  });

  it('masks Authorization and the Google key header', () => {
    expect(
      maskHeaders({ Authorization: 'Bearer jwt', 'X-Goog-Api-Key': 'AIza', Accept: 'json' }),
    ).toEqual({ Authorization: MASKED, 'X-Goog-Api-Key': MASKED, Accept: 'json' });
  });

  it('strips the origin and masks key / token query params (inline and in params)', () => {
    expect(
      formatUrl('https://maps.googleapis.com/maps/api/geocode/json?key=AIza', {
        latlng: '40.4,49.8',
        language: 'az',
      }),
    ).toBe(`/maps/api/geocode/json?key=${MASKED}&latlng=40.4%2C49.8&language=az`);
    expect(formatUrl('/api/TripHistory/user/7', { PageNumber: 1, token: 'x' })).toBe(
      `/api/TripHistory/user/7?PageNumber=1&token=${MASKED}`,
    );
  });

  it('pretty-prints JSON strings with secrets masked and truncates long bodies', () => {
    expect(formatBody('{"email":"a","password":"p"}')).toBe(
      `{\n  "email": "a",\n  "password": "${MASKED}"\n}`,
    );
    expect(formatBody('')).toBeNull();
    expect(formatBody('not json')).toBe('not json');
    const long = truncate('x'.repeat(NETWORK_LOG_MAX_BODY_CHARS + 10));
    expect(long.startsWith('x'.repeat(NETWORK_LOG_MAX_BODY_CHARS))).toBe(true);
    expect(long).toContain('(+10 chars)');
  });
});

describe('ring buffer', () => {
  it('keeps the newest 100 entries, newest first', () => {
    for (let i = 0; i < NETWORK_LOG_MAX_ENTRIES + 5; i += 1)
      networkLog.add(entry({ timestamp: i }));
    const entries = networkLog.getEntries();
    expect(entries).toHaveLength(NETWORK_LOG_MAX_ENTRIES);
    expect(entries[0]?.timestamp).toBe(NETWORK_LOG_MAX_ENTRIES + 4);
    expect(entries.at(-1)?.timestamp).toBe(5);
  });

  it('notifies subscribers on add and clear, until unsubscribed', () => {
    const listener = jest.fn();
    const off = networkLog.subscribe(listener);
    networkLog.add(entry());
    networkLog.clear();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(networkLog.getEntries()).toEqual([]);
    off();
    networkLog.add(entry());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('flags errors: failed status, no response, or an error message', () => {
    expect(isErrorEntry({ ...entry(), id: 1 })).toBe(false);
    expect(isErrorEntry({ ...entry({ status: 404 }), id: 1 })).toBe(true);
    expect(isErrorEntry({ ...entry({ status: null, error: 'Network Error' }), id: 1 })).toBe(true);
  });
});

describe('attachNetworkLogger', () => {
  function clientWith(adapter: AxiosAdapter) {
    const client = create({ baseURL: 'https://api.example.test', adapter });
    attachNetworkLogger(client, 'api');
    return client;
  }

  it('records a successful request with masked headers and bodies', async () => {
    const client = clientWith(async (config: InternalAxiosRequestConfig) => ({
      data: { success: true, data: { tokens: { accessToken: 'jwt' } } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    await client.post(
      '/api/Auth/login',
      { email: 'a@b.c', password: 'secret' },
      { headers: { Authorization: 'Bearer jwt' } },
    );

    const [logged] = networkLog.getEntries();
    expect(logged).toMatchObject({ method: 'POST', url: '/api/Auth/login', status: 200 });
    expect(logged?.requestHeaders.Authorization).toBe(MASKED);
    expect(logged?.requestBody).toContain(`"password": "${MASKED}"`);
    expect(logged?.responseBody).toContain(`"accessToken": "${MASKED}"`);
    expect(logged?.responseBody).not.toContain('jwt');
  });

  it('keeps the query (and its PII) out of the Console line', async () => {
    const client = clientWith(async (config: InternalAxiosRequestConfig) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }));
    await client.get('/maps/api/geocode/json', { params: { latlng: '40.4,49.8' } });
    const line = String(jest.mocked(logger.info).mock.calls.at(-1)?.[0]);
    expect(line).toMatch(/^→ GET \/maps\/api\/geocode\/json 200 \d+ms$/);
    expect(networkLog.getEntries()[0]?.url).toContain('latlng=');
  });

  it('records network errors and still rejects', async () => {
    const client = clientWith((config: InternalAxiosRequestConfig) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)),
    );
    await expect(client.get('/api/Rides')).rejects.toThrow('Network Error');
    expect(networkLog.getEntries()[0]).toMatchObject({
      status: null,
      error: 'Network Error',
      url: '/api/Rides',
    });
  });
});
