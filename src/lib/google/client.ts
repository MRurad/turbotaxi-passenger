import { create } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { attachNetworkLogger as AttachNetworkLogger } from '@/api/devNetworkLog';
import { toApiError } from '@/api/errors';
import { config } from '@/constants/config';
import { GOOGLE_PLACES_BASE_URL, GOOGLE_TIMEOUT_MS } from '@/constants/google';

/**
 * Headers Google needs when the API key is restricted to this app (bundle id / package).
 * In Expo Go these are TurboTaxi's ids from app.config.ts, not Expo Go's.
 */
function appRestrictionHeaders(): Record<string, string> {
  const expoConfig = Constants.expoConfig;
  if (Platform.OS === 'ios' && expoConfig?.ios?.bundleIdentifier) {
    return { 'X-Ios-Bundle-Identifier': expoConfig.ios.bundleIdentifier };
  }
  if (Platform.OS === 'android' && expoConfig?.android?.package) {
    return { 'X-Android-Package': expoConfig.android.package };
  }
  return {};
}

/**
 * Separate axios instance for Google Maps Platform (the only allowed exception to the single
 * apiClient rule). Never sends our backend token.
 */
export const googleClient = create({
  baseURL: GOOGLE_PLACES_BASE_URL,
  timeout: GOOGLE_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': config.GOOGLE_MAPS_API_KEY,
    ...appRestrictionHeaders(),
  },
});

// Dev-only HTTP log (API key masked in URL + headers); attached before the error mapping below.
// The branch and its require are stripped from release bundles.
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devLog = require('@/api/devNetworkLog') as {
    attachNetworkLogger: typeof AttachNetworkLogger;
  };
  devLog.attachNetworkLogger(googleClient, 'google');
}

googleClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
