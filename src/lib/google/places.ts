import { ApiError } from '@/api/errors';
import { config } from '@/constants/config';
import {
  AUTOCOMPLETE_BIAS_RADIUS_M,
  GOOGLE_FIELD_MASKS,
  GOOGLE_GEOCODE_URL,
  GOOGLE_PLACES_PATHS,
  GOOGLE_REGION_CODE,
} from '@/constants/google';
import type { Language } from '@/i18n';
import type { LatLng } from '@/types/geo';
import type { Place, PlaceSuggestion } from '@/types/place';

import { googleClient } from './client';
import { mapPlaceDetails, mapReverseGeocode, mapSuggestions } from './mappers';
import { autocompleteResponseSchema, geocodeResponseSchema, placeDetailsSchema } from './schemas';

interface RequestContext {
  language: Language;
  signal?: AbortSignal;
}

function invalid(what: string): ApiError {
  return new ApiError({ code: 'invalidResponse', serverMessage: `google ${what}` });
}

/** Places API (New) autocomplete, biased to the user and limited to Azerbaijan. */
export async function autocomplete(
  input: string,
  sessionToken: string,
  bias: LatLng | null,
  { language, signal }: RequestContext,
): Promise<PlaceSuggestion[]> {
  const body = {
    input,
    sessionToken,
    languageCode: language,
    includedRegionCodes: [GOOGLE_REGION_CODE],
    ...(bias
      ? { locationBias: { circle: { center: bias, radius: AUTOCOMPLETE_BIAS_RADIUS_M } } }
      : {}),
  };
  const { data } = await googleClient.post<unknown>(GOOGLE_PLACES_PATHS.autocomplete, body, {
    headers: { 'X-Goog-FieldMask': GOOGLE_FIELD_MASKS.autocomplete },
    signal,
  });
  const parsed = autocompleteResponseSchema.safeParse(data);
  if (!parsed.success) throw invalid('autocomplete');
  return mapSuggestions(parsed.data);
}

/** Coordinates for a picked suggestion. Same session token ends the billing session. */
export async function placeDetails(
  suggestion: PlaceSuggestion,
  sessionToken: string,
  { language, signal }: RequestContext,
): Promise<Place> {
  const { data } = await googleClient.get<unknown>(
    GOOGLE_PLACES_PATHS.details(suggestion.placeId),
    {
      params: { sessionToken, languageCode: language },
      headers: { 'X-Goog-FieldMask': GOOGLE_FIELD_MASKS.details },
      signal,
    },
  );
  const parsed = placeDetailsSchema.safeParse(data);
  if (!parsed.success) throw invalid('details');
  return mapPlaceDetails(parsed.data, suggestion);
}

/** Geocoding API: address for a map point, or null if Google has none. */
export async function reverseGeocode(
  location: LatLng,
  { language, signal }: RequestContext,
): Promise<Place | null> {
  const { data } = await googleClient.get<unknown>(GOOGLE_GEOCODE_URL, {
    params: {
      latlng: `${location.latitude},${location.longitude}`,
      language,
      key: config.GOOGLE_MAPS_API_KEY,
    },
    signal,
  });
  const parsed = geocodeResponseSchema.safeParse(data);
  if (!parsed.success) throw invalid('geocode');
  if (parsed.data.status === 'ZERO_RESULTS') return null;
  if (parsed.data.status !== 'OK') {
    // REQUEST_DENIED (key/API not enabled), OVER_QUERY_LIMIT, …
    throw new ApiError({
      code: 'server',
      serverMessage: parsed.data.error_message ?? parsed.data.status,
    });
  }
  return mapReverseGeocode(parsed.data, location);
}
