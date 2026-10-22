/**
 * Which service answers place search and reverse geocoding. Photon (OpenStreetMap, free, no
 * key) while Google billing is off; switch back to 'google' once it's enabled.
 */
export const PLACES_PROVIDER: 'photon' | 'google' = 'photon';

/** Photon (komoot) public API: OpenStreetMap data, built for search-as-you-type. */
export const PHOTON_BASE_URL = 'https://photon.komoot.io';
export const PHOTON_PATHS = { search: '/api/', reverse: '/reverse' } as const;
export const PHOTON_TIMEOUT_MS = 10_000;
export const PHOTON_RESULT_LIMIT = 8;

/** Azerbaijan as minLon,minLat,maxLon,maxLat: results stay in the country. */
export const PHOTON_BBOX_AZ = '44.76,38.39,50.39,41.92';

/** Reverse geocoding skips transit stops (a bus stop name) in favour of street addresses. */
export const PHOTON_REVERSE_EXCLUDED_TAGS = ['!highway:bus_stop', '!public_transport'] as const;

/** Photon only knows a few languages; others get local names (Azerbaijani in Baku). */
export const PHOTON_LANGUAGES: readonly string[] = ['en'];
export const PHOTON_DEFAULT_LANGUAGE = 'default';

/** After a provider error (e.g. Photon 429 / 5xx), the OS geocoder answers for this long. */
export const PLACES_PROVIDER_COOLDOWN_MS = 5 * 60_000;

/** Photon is a shared public service: at most this many reverse lookups in flight. */
export const PHOTON_MAX_CONCURRENT_REVERSE = 2;
