/** REST request timeout (axios). */
export const API_TIMEOUT_MS = 15_000;

/** How long to wait for a driver before showing "no driver found". */
export const SEARCH_TIMEOUT_MS = 3 * 60_000;

/** SignalR keep-alive Ping interval. */
export const PING_INTERVAL_MS = 30_000;

/** Debounce for Google Places autocomplete input. */
export const AUTOCOMPLETE_DEBOUNCE_MS = 300;

/** A persisted active ride older than this is discarded on app start. */
export const ACTIVE_RIDE_STALE_MS = 3 * 60 * 60_000;
