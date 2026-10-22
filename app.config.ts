import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'az.turbotaxi.passenger';
const BRAND_STEEL_BLUE = '#4682B4';
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * User-facing version. Build numbers are kept by EAS (eas.json appVersionSource "remote",
 * auto-incremented for production); the two below only apply to local native builds.
 */
const APP_VERSION = '1.0.0';
const IOS_BUILD_NUMBER = '1';
const ANDROID_VERSION_CODE = 1;

/**
 * Filled in once after `eas init` (see docs/BUILD.md). Until then EAS commands ask to link
 * the project. Not a secret.
 */
const EAS_PROJECT_ID: string | undefined = undefined;

/** English text; az / ru come from locales/ios/*.json (iOS picks by the device language). */
const LOCATION_PERMISSION_TEXT =
  'TurboTaxi uses your location to set your pickup point and show your driver on the map.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TurboTaxi',
  slug: 'turbotaxi-passenger',
  scheme: 'turbotaxi',
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    buildNumber: IOS_BUILD_NUMBER,
    supportsTablet: false,
    config: { googleMapsApiKey },
    infoPlist: {
      // The app ships its own az / ru / en strings; let iOS use them for system texts too.
      CFBundleLocalizations: ['az', 'ru', 'en'],
      CFBundleAllowMixedLocalizations: true,
      // Only standard HTTPS: no export-compliance questions on every TestFlight upload.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  locales: {
    az: './locales/ios/az.json',
    ru: './locales/ios/ru.json',
    en: './locales/ios/en.json',
  },
  android: {
    package: BUNDLE_ID,
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      backgroundColor: BRAND_STEEL_BLUE,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    config: { googleMaps: { apiKey: googleMapsApiKey } },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#0B1220' },
      },
    ],
    ['expo-location', { locationWhenInUsePermission: LOCATION_PERMISSION_TEXT }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...config.extra,
    // Public flag (not the key): the Google Maps SDK is in the native build only with a key,
    // and ios.config is stripped from the config the app can read (src/features/map/constants.ts).
    hasGoogleMapsKey: Boolean(googleMapsApiKey),
    ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
  },
});
