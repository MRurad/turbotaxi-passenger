/** REST request timeout (axios). */
export const API_TIMEOUT_MS = 15_000;

/** How long to wait for a driver before showing "no driver found". */
export const SEARCH_TIMEOUT_MS = 3 * 60_000;

/** "Searching for 0:42" ticks this often. */
export const ELAPSED_TICK_MS = 1_000;

/** One pulse of the ring around the pickup while searching. */
export const SEARCH_PULSE_MS = 1_800;

/** SignalR keep-alive Ping interval. */
export const PING_INTERVAL_MS = 30_000;

/** Debounce for Google Places autocomplete input. */
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/** Default on-screen time for a toast. */
export const TOAST_DURATION_MS = 3_500;

/** TanStack Query staleTime default. */
export const QUERY_STALE_TIME_MS = 30_000;

/** A route price is reused this long for the same route + class + promo (no re-POST on remount). */
export const ROUTE_ESTIMATE_STALE_TIME_MS = 2 * 60_000;

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

/** Short nudge that puts the target exactly under the pin after a camera animation. */
export const MAP_FOCUS_CORRECTION_MS = 200;

/** SignalR reconnect delays; after the last one it keeps retrying at that interval forever. */
export const REALTIME_RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 20_000, 30_000] as const;

/** In the background with no active ride, the hubs are stopped after this long. */
export const REALTIME_BACKGROUND_STOP_MS = 30_000;

/** A hub drop must last this long before the connection banner appears (no flashes). */
export const BANNER_SHOW_DELAY_MS = 1_500;

/** Once shown, the connection banner stays at least this long. */
export const BANNER_MIN_VISIBLE_MS = 800;
