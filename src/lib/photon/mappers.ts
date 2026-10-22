import type { Place, PlaceSuggestion } from '@/types/place';

import type { PhotonFeature } from './schemas';

/**
 * Photon feature → suggestion. Title: the place's name, else "Street 12". Subtitle: what isn't
 * already in the title (street, district, city), e.g. "Gənclik" → "Nərimanov rayonu, Bakı".
 */
export function mapPhotonFeature(feature: PhotonFeature): PlaceSuggestion | null {
  const p = feature.properties;
  const streetLine = p.street ? [p.street, p.housenumber].filter(Boolean).join(' ') : '';
  const title = p.name || streetLine;
  if (!title) return null;
  const area = [p.name ? streetLine : '', p.district || p.locality, p.city || p.county || p.state]
    .filter((part): part is string => Boolean(part) && part !== title)
    .join(', ');
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    placeId: `osm:${p.osm_type ?? ''}${p.osm_id ?? `${latitude},${longitude}`}`,
    title,
    subtitle: area,
    location: { latitude, longitude },
  };
}

/** OSM often has one place several times (a station and its stops): keep the first of each. */
export function mapPhotonSuggestions(features: PhotonFeature[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  return features.flatMap((feature) => {
    const suggestion = mapPhotonFeature(feature);
    if (!suggestion) return [];
    const key = `${suggestion.title}|${suggestion.subtitle}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [suggestion];
  });
}

/** A suggestion that already carries coordinates is a Place as it is. */
export function placeFromSuggestion(suggestion: PlaceSuggestion): Place | null {
  if (!suggestion.location) return null;
  return {
    placeId: suggestion.placeId,
    title: suggestion.title,
    subtitle: suggestion.subtitle,
    location: suggestion.location,
  };
}
