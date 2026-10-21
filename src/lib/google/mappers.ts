import type { LatLng } from '@/types/geo';
import type { Place, PlaceSuggestion } from '@/types/place';

import type { AutocompleteResponse, GeocodeResponse, PlaceDetailsResponse } from './schemas';

/** Trailing country part of a Google address ("…, Azerbaijan" / "…, Azərbaycan"). */
const COUNTRY_SEPARATOR = ', ';

/** "28 May St 12, Baku, Azerbaijan" → { title: "28 May St 12", subtitle: "Baku" }. */
export function splitAddress(formatted: string): { title: string; subtitle: string } {
  const parts = formatted
    .split(COUNTRY_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { title: parts[0] ?? '', subtitle: '' };
  // Drop the country (always last) when there is something else to show.
  const withoutCountry = parts.length > 2 ? parts.slice(0, -1) : parts;
  return {
    title: withoutCountry[0] ?? '',
    subtitle: withoutCountry.slice(1).join(COUNTRY_SEPARATOR),
  };
}

export function mapSuggestions(data: AutocompleteResponse): PlaceSuggestion[] {
  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) => {
    if (!p) return [];
    const title = p.structuredFormat?.mainText?.text ?? p.text?.text ?? '';
    const subtitle = p.structuredFormat?.secondaryText?.text ?? '';
    return title ? [{ placeId: p.placeId, title, subtitle }] : [];
  });
}

export function mapPlaceDetails(data: PlaceDetailsResponse, fallback?: PlaceSuggestion): Place {
  const { title, subtitle } = splitAddress(data.formattedAddress ?? '');
  return {
    placeId: data.id,
    // Prefer the name the user picked ("Port Baku Towers") over the street address.
    title: fallback?.title || title,
    subtitle: fallback?.subtitle || subtitle,
    location: { latitude: data.location.latitude, longitude: data.location.longitude },
  };
}

/** Best result for a map point; null when Google has nothing (ZERO_RESULTS). */
export function mapReverseGeocode(data: GeocodeResponse, location: LatLng): Place | null {
  // plus_code results ("8J6X+2M Baku") are not useful to show: only those → unnamed point.
  const result = data.results?.find((r) => !r.types?.includes('plus_code'));
  if (!result)
    return data.results?.length ? { placeId: null, title: '', subtitle: '', location } : null;
  const { title, subtitle } = splitAddress(result.formatted_address);
  return { placeId: result.place_id ?? null, title, subtitle, location };
}
