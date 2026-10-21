/** Google Maps Platform REST endpoints (called directly from the app; key from config). */
export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1';
export const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export const GOOGLE_PLACES_PATHS = {
  autocomplete: '/places:autocomplete',
  details: (placeId: string) => `/places/${encodeURIComponent(placeId)}`,
} as const;

/** Billing: request only the fields we render. */
export const GOOGLE_FIELD_MASKS = {
  autocomplete:
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
  // No displayName: it moves Place Details from the Essentials to the Pro price tier, and the
  // suggestion's own title is shown instead.
  details: 'id,location,formattedAddress',
} as const;

/** Results are limited to Azerbaijan. */
export const GOOGLE_REGION_CODE = 'az';

/** Autocomplete location bias radius around the user (meters). */
export const AUTOCOMPLETE_BIAS_RADIUS_M = 30_000;

/** Don't call autocomplete for shorter input. */
export const AUTOCOMPLETE_MIN_CHARS = 2;

/** Google REST timeout. */
export const GOOGLE_TIMEOUT_MS = 10_000;
