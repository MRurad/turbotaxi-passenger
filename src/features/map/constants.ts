import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Region } from 'react-native-maps';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * The Google Maps SDK is only compiled into an iOS build that had a key at build time
 * (app.config.ts sets extra.hasGoogleMapsKey); asking for Google without it breaks the map.
 */
const iosHasGoogleMaps = !isExpoGo && Constants.expoConfig?.extra?.hasGoogleMapsKey === true;

/**
 * Google on Android and in iOS builds that include it; otherwise (Expo Go, a build without the
 * key) Apple Maps (custom styles don't apply there; userInterfaceStyle handles dark mode).
 */
export const MAP_PROVIDER =
  Platform.OS === 'android' || iosHasGoogleMaps ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
export const IS_GOOGLE_MAP = MAP_PROVIDER === PROVIDER_GOOGLE;

/** Fallback when location permission is denied or not yet known. */
export const BAKU_REGION: Region = {
  latitude: 40.4093,
  longitude: 49.8671,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

/** Zoom when centering on the user (≈ a few blocks). */
export const USER_ZOOM_DELTA = 0.012;

/** Closer zoom while placing a pickup / destination pin ("Choose on map"): street level. */
export const PICK_ZOOM_DELTA = 0.0025;
