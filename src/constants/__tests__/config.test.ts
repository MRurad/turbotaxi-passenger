const ORIGINAL_ENV = process.env;

function loadConfigWith(env: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...env };
  let loaded: typeof import('@/constants/config') | undefined;
  jest.isolateModules(() => {
    // require() is needed so the module re-evaluates with the patched env inside isolateModules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/constants/config');
  });
  return loaded?.config;
}

describe('config', () => {
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('loads valid env vars', () => {
    const config = loadConfigWith({
      EXPO_PUBLIC_API_URL: 'https://api.example.com',
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-key',
    });
    expect(config).toEqual({ API_URL: 'https://api.example.com', GOOGLE_MAPS_API_KEY: 'test-key' });
  });

  it('throws a readable error when the Google key is empty', () => {
    expect(() =>
      loadConfigWith({
        EXPO_PUBLIC_API_URL: 'https://api.example.com',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: '',
      }),
    ).toThrow(/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is empty/);
  });

  it('throws when the API URL is not a URL', () => {
    expect(() =>
      loadConfigWith({
        EXPO_PUBLIC_API_URL: 'not a url',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-key',
      }),
    ).toThrow(/EXPO_PUBLIC_API_URL must be a valid URL/);
  });
});
