const ORIGINAL_ENV = process.env;
/** React Native's build flag (true under Jest); a release build has it false. */
const runtime = globalThis as unknown as { __DEV__: boolean };

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

  describe('in a release build (no throw at launch: it would kill the app)', () => {
    const dev = runtime.__DEV__;
    beforeEach(() => {
      runtime.__DEV__ = false;
    });
    afterEach(() => {
      runtime.__DEV__ = dev;
    });

    it('falls back to the production API and no Google key when both are missing', () => {
      const config = loadConfigWith({
        EXPO_PUBLIC_API_URL: undefined,
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      });
      expect(config).toEqual({
        API_URL: 'https://api.turbotaxi.deepcode.az',
        GOOGLE_MAPS_API_KEY: '',
      });
    });

    it('keeps a valid API URL when only the Google key is missing', () => {
      const config = loadConfigWith({
        EXPO_PUBLIC_API_URL: 'https://api.example.com',
        EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
      });
      expect(config).toEqual({ API_URL: 'https://api.example.com', GOOGLE_MAPS_API_KEY: '' });
    });
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
