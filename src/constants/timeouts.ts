/** REST request timeout (axios). */
export const API_TIMEOUT_MS = 15_000;

/** How long to wait for a driver before showing "no driver found". */
export const SEARCH_TIMEOUT_MS = 3 * 60_000;

/** SignalR keep-alive Ping interval. */
export const PING_INTERVAL_MS = 30_000;

/** Debounce for Google Places autocomplete input. */
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/** Default on-screen time for a toast. */
export const TOAST_DURATION_MS = 3_500;

/** TanStack Query staleTime default. */
export const QUERY_STALE_TIME_MS = 30_000;

/** A persisted active ride older than this is discarded on app start. */
export const ACTIVE_RIDE_STALE_MS = 3 * 60 * 60_000;

/** Wait after the map stops moving before reverse-geocoding the center pin. */
export const REVERSE_GEOCODE_DEBOUNCE_MS = 400;

/** Reverse-geocode / place details results are stable; cache them for a long time. */
export const PLACES_STALE_TIME_MS = 24 * 60 * 60_000;

/** Map camera animations. */
export const MAP_ANIMATION_MS = 450;

/** Car marker glides between driver location updates over this long. */
export const CAR_MARKER_ANIMATION_MS = 1_000;
