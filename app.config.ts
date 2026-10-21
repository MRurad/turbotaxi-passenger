import type { ConfigContext, ExpoConfig } from 'expo/config';

const BUNDLE_ID = 'az.turbotaxi.passenger';
const BRAND_STEEL_BLUE = '#4682B4';
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TurboTaxi',
  slug: 'turbotaxi-passenger',
  scheme: 'turbotaxi',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    config: { googleMapsApiKey },
  },
  android: {
    package: BUNDLE_ID,
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
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'TurboTaxi uses your location to set your pickup point and show your driver on the map.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
