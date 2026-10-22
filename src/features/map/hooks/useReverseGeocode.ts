import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { toApiError, type ApiError } from '@/api/errors';
import { PLACES_PROVIDER, PLACES_PROVIDER_COOLDOWN_MS } from '@/constants/places';
import { queryKeys } from '@/constants/queryKeys';
import { PLACES_STALE_TIME_MS } from '@/constants/timeouts';
import { getLanguage, type Language } from '@/i18n';
import { roundCoords } from '@/lib/geo';
import { reverseGeocode } from '@/lib/places';
import { logger } from '@/lib/logger';
import { nativeReverseGeocode } from '@/lib/nativeGeocode';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

/** ≈11 m: nearby pin drops share one (billed) geocode; the caller keeps the exact point. */
const GEOCODE_KEY_DECIMALS = 4;

/** Connection problems: rethrown so the query retries (no fallback cached for a day). */
const TRANSIENT_CODES: ReadonlySet<ApiError['code']> = new Set(['network', 'timeout', 'cancelled']);
/** Google refusing the key (REQUEST_DENIED) won't change this session. */
const GOOGLE_REFUSAL_CODES: ReadonlySet<ApiError['code']> = new Set(['server', 'forbidden']);

/** Until then the provider is skipped (after it failed); Infinity = for the session. */
let skipProviderUntil = 0;

/** Test-only: forget a provider failure. */
export function resetGeocodeFallback(): void {
  skipProviderUntil = 0;
}

/**
 * The places provider first (Photon or Google, app language); when it fails or has no
 * address, the OS geocoder. A failing provider is skipped for a while — Photon (a public
 * service: 429 / 5xx) for a few minutes, a Google key refusal for the session. Connection
 * errors are rethrown so the query retries instead of caching a fallback for 24 h.
 */
export async function resolveAddress(
  point: LatLng,
  { language, signal }: { language: Language; signal?: AbortSignal },
): Promise<Place | null> {
  let providerPlace: Place | null = null;
  let providerError: ApiError | null = null;
  if (Date.now() >= skipProviderUntil) {
    try {
      providerPlace = await reverseGeocode(point, { language, signal });
    } catch (error) {
      providerError = toApiError(error);
      if (TRANSIENT_CODES.has(providerError.code)) throw providerError;
      const forSession =
        PLACES_PROVIDER === 'google' && GOOGLE_REFUSAL_CODES.has(providerError.code);
      skipProviderUntil = forSession ? Infinity : Date.now() + PLACES_PROVIDER_COOLDOWN_MS;
      logger.warn('geocode: provider failed, using the OS geocoder', {
        code: providerError.code,
      });
    }
  }
  if (providerPlace?.title) return providerPlace;
  const native = await nativeReverseGeocode(point);
  if (native) return native;
  if (providerError) throw providerError;
  return providerPlace;
}

/**
 * Address for a settled map point (null point = don't query). Language is part of the key.
 * Kept a day (gcTime too: a revisited history list doesn't geocode everything again); only
 * connection errors are retried.
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
    gcTime: PLACES_STALE_TIME_MS,
    retry: (count, error) => TRANSIENT_CODES.has(error.code) && count < 1,
  });
}
