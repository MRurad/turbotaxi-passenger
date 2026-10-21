import * as Location from 'expo-location';

import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';

import { logger } from './logger';

/** Android's `name` is often a plus code ("8J6X+2M") or just the house number. */
const UNUSABLE_NAME = /^([23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}.*|\d+\S*)$/i;

/**
 * OS geocoder address → "Nizami küç. 12" / "Bakı". Street + number first (that's what a
 * driver needs), then the place name, then the district. Null when nothing is usable.
 * Note: the OS answers in the device language, not the app language (no locale option).
 */
export function mapNativeAddress(
  address: Location.LocationGeocodedAddress,
  location: LatLng,
): Place | null {
  // A house number alone ("12") is meaningless without its street.
  const streetLine = address.street
    ? [address.street, address.streetNumber].filter(Boolean).join(' ')
    : '';
  const name = address.name && !UNUSABLE_NAME.test(address.name) ? address.name : '';
  const title = streetLine || name || address.district || '';
  if (!title) return null;
  // City only, like the Google results ("Baku"), so recents read the same either way.
  const area = address.city || address.subregion || address.region || '';
  return { placeId: null, title, subtitle: area === title ? '' : area, location };
}

/**
 * Apple's / Android's built-in geocoder (works in Expo Go, no API key). Used when Google
 * returns nothing or refuses the request. Never throws: no address → null.
 */
export async function nativeReverseGeocode(location: LatLng): Promise<Place | null> {
  try {
    const [first] = await Location.reverseGeocodeAsync(location);
    return first ? mapNativeAddress(first, location) : null;
  } catch (error) {
    // Android without location permission, or the OS geocoder is offline.
    logger.warn('geocode: native fallback failed', {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
