import { ApiError } from '@/api/errors';
import {
  PHOTON_BBOX_AZ,
  PHOTON_DEFAULT_LANGUAGE,
  PHOTON_LANGUAGES,
  PHOTON_MAX_CONCURRENT_REVERSE,
  PHOTON_PATHS,
  PHOTON_RESULT_LIMIT,
  PHOTON_REVERSE_EXCLUDED_TAGS,
} from '@/constants/places';
import type { Language } from '@/i18n';
import type { LatLng } from '@/types/geo';
import type { Place, PlaceSuggestion } from '@/types/place';

import { photonClient } from './client';
import { mapPhotonFeature, mapPhotonSuggestions, placeFromSuggestion } from './mappers';
import { photonResponseSchema, type PhotonFeature } from './schemas';

interface RequestContext {
  language: Language;
  signal?: AbortSignal;
}

const photonLanguage = (language: Language): string =>
  PHOTON_LANGUAGES.includes(language) ? language : PHOTON_DEFAULT_LANGUAGE;

function features(data: unknown, what: string): PhotonFeature[] {
  const parsed = photonResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError({ code: 'invalidResponse', serverMessage: `photon ${what}` });
  }
  return parsed.data.features;
}

/** Search as you type, limited to Azerbaijan and biased to `bias`. Results carry coordinates. */
export async function autocomplete(
  input: string,
  _sessionToken: string,
  bias: LatLng | null,
  { language, signal }: RequestContext,
): Promise<PlaceSuggestion[]> {
  const { data } = await photonClient.get<unknown>(PHOTON_PATHS.search, {
    params: {
      q: input,
      limit: PHOTON_RESULT_LIMIT,
      lang: photonLanguage(language),
      bbox: PHOTON_BBOX_AZ,
      ...(bias ? { lat: bias.latitude, lon: bias.longitude } : {}),
    },
    signal,
  });
  return mapPhotonSuggestions(features(data, 'search'));
}

/** Photon suggestions already have coordinates: no second request. */
export async function placeDetails(
  suggestion: PlaceSuggestion,
  _sessionToken: string,
  _context: RequestContext,
): Promise<Place> {
  const place = placeFromSuggestion(suggestion);
  if (!place) throw new ApiError({ code: 'invalidResponse', serverMessage: 'photon details' });
  return place;
}

let reverseInFlight = 0;
const reverseWaiting: (() => void)[] = [];

/** Runs `task` once a slot is free (a history list asks for many addresses at once). */
async function withReverseSlot<T>(task: () => Promise<T>): Promise<T> {
  if (reverseInFlight < PHOTON_MAX_CONCURRENT_REVERSE) reverseInFlight += 1;
  else await new Promise<void>((resolve) => reverseWaiting.push(resolve)); // slot handed over
  try {
    return await task();
  } finally {
    const next = reverseWaiting.shift();
    if (next) next();
    else reverseInFlight -= 1;
  }
}

/** Nearest address for a map point (transit stops skipped), or null if there is none. */
export async function reverseGeocode(
  location: LatLng,
  { language, signal }: RequestContext,
): Promise<Place | null> {
  const { data } = await withReverseSlot(() =>
    photonClient.get<unknown>(PHOTON_PATHS.reverse, {
      params: {
        lat: location.latitude,
        lon: location.longitude,
        limit: 1,
        lang: photonLanguage(language),
        osm_tag: [...PHOTON_REVERSE_EXCLUDED_TAGS],
      },
      signal,
    }),
  );
  const [first] = features(data, 'reverse');
  const found = first ? mapPhotonFeature(first) : null;
  // The pin stays the place's location; the feature only names it. No place id: two pins on
  // one long street share that street's OSM id and would merge in recent places.
  return found ? { placeId: null, title: found.title, subtitle: found.subtitle, location } : null;
}
