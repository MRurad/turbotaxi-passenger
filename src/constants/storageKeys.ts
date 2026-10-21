/** SecureStore keys (session tokens + the signed-in user's PII). Allowed chars: [A-Za-z0-9._-]. */
export const SECURE_KEYS = {
  accessToken: 'turbotaxi.accessToken',
  refreshToken: 'turbotaxi.refreshToken',
  tokenExpiresAt: 'turbotaxi.tokenExpiresAt',
  user: 'turbotaxi.session.user',
  /** Active ride's pickup + destination (addresses and coordinates are personal data). */
  activeRidePlaces: 'turbotaxi.activeRide.places',
} as const;

/** AsyncStorage keys (non-secret data). */
export const STORAGE_KEYS = {
  /** Pre-SecureStore location of the cached user. Only read to delete it (PII cleanup). */
  legacyUser: 'turbotaxi.user',
  themeMode: 'turbotaxi.themeMode',
  language: 'turbotaxi.language',
  recentPlaces: 'turbotaxi.recentPlaces',
  activeRide: 'turbotaxi.activeRide',
  bookingDraft: 'turbotaxi.bookingDraft',
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
