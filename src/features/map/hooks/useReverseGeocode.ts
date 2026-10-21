import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { ApiError } from '@/api/errors';
import { queryKeys } from '@/constants/queryKeys';
import { PLACES_STALE_TIME_MS } from '@/constants/timeouts';
import { getLanguage } from '@/i18n';
import { roundCoords } from '@/lib/geo';
import { reverseGeocode } from '@/lib/google/places';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

/** ≈11 m: nearby pin drops share one (billed) geocode; the caller keeps the exact point. */
const GEOCODE_KEY_DECIMALS = 4;

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
    queryFn: rounded ? ({ signal }) => reverseGeocode(rounded, { language, signal }) : skipToken,
    staleTime: PLACES_STALE_TIME_MS,
    retry: (count, error) => error.code !== 'server' && error.code !== 'forbidden' && count < 1,
  });
}
