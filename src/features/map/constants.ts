import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';

import type { Region } from 'react-native-maps';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Google everywhere except iOS Expo Go, which can't load the Google Maps SDK and falls back
 * to Apple Maps (custom styles don't apply there; userInterfaceStyle handles dark mode).
 */
export const MAP_PROVIDER =
  Platform.OS === 'android' || !isExpoGo ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;
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
