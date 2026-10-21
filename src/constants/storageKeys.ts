/** SecureStore keys (tokens only). SecureStore allows [A-Za-z0-9._-]. */
export const SECURE_KEYS = {
  accessToken: 'turbotaxi.accessToken',
  refreshToken: 'turbotaxi.refreshToken',
  tokenExpiresAt: 'turbotaxi.tokenExpiresAt',
} as const;

/** AsyncStorage keys (non-secret data). */
export const STORAGE_KEYS = {
  user: 'turbotaxi.user',
  themeMode: 'turbotaxi.themeMode',
  language: 'turbotaxi.language',
  recentPlaces: 'turbotaxi.recentPlaces',
  activeRide: 'turbotaxi.activeRide',
  bookingDraft: 'turbotaxi.bookingDraft',
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
