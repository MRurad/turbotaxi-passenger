import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { toApiError, type ApiError } from '@/api/errors';
import { queryKeys } from '@/constants/queryKeys';
import { PLACES_STALE_TIME_MS } from '@/constants/timeouts';
import { getLanguage, type Language } from '@/i18n';
import { roundCoords } from '@/lib/geo';
import { reverseGeocode } from '@/lib/google/places';
import { logger } from '@/lib/logger';
import { nativeReverseGeocode } from '@/lib/nativeGeocode';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

/** ≈11 m: nearby pin drops share one (billed) geocode; the caller keeps the exact point. */
const GEOCODE_KEY_DECIMALS = 4;

/** Google refused this key (REQUEST_DENIED, …): skip it for the rest of the session. */
let googleRefused = false;

/** Test-only: forget a refusal. */
export function resetGeocodeFallback(): void {
  googleRefused = false;
}

/**
 * Google first (app language, place id); when it refuses the request (e.g. REQUEST_DENIED
 * for an app-restricted key) or only has a plus code, the OS geocoder. Network errors and
 * timeouts are rethrown so the query retries Google instead of caching a fallback for 24 h.
 */
export async function resolveAddress(
  point: LatLng,
  { language, signal }: { language: Language; signal?: AbortSignal },
): Promise<Place | null> {
  let googlePlace: Place | null = null;
  let googleError: ApiError | null = null;
  if (!googleRefused) {
    try {
      googlePlace = await reverseGeocode(point, { language, signal });
    } catch (error) {
      googleError = toApiError(error);
      if (googleError.code !== 'server' && googleError.code !== 'forbidden') throw googleError;
      googleRefused = true;
      logger.warn('geocode: google refused, using the OS geocoder', { code: googleError.code });
    }
  }
  if (googlePlace?.title) return googlePlace;
  const native = await nativeReverseGeocode(point);
  if (native) return native;
  if (googleError) throw googleError;
  return googlePlace;
}

/**
 * Address for a settled map point (null point = don't query). Language is part of the key.
 * Google errors (REQUEST_DENIED, OVER_QUERY_LIMIT) are not retried.
 */
export function useReverseGeocode(point: LatLng | null) {
  // Subscribing re-runs the query in the new language after a language switch.
  useTranslation();
  const language = getLanguage();
  const rounded = point ? roundCoords(point, GEOCODE_KEY_DECIMALS) : null;

  return useQuery<Place | null, ApiError>({
    queryKey: rounded ? queryKeys.places.reverse(rounded, language) : ['places', 'reverse', 'idle'],
    queryFn: rounded ? ({ signal }) => resolveAddress(rounded, { language, signal }) : skipToken,
    staleTime: PLACES_STALE_TIME_MS,
    retry: (count, error) => error.code !== 'server' && error.code !== 'forbidden' && count < 1,
  });
}
