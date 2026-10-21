import { decode } from '@googlemaps/polyline-codec';

import type { LatLng } from '@/types/geo';

/** Google encoded polyline → coordinates. Invalid input yields an empty route. */
export function decodePolyline(encoded: string | null | undefined): LatLng[] {
  if (!encoded) return [];
  try {
    return decode(encoded).map(([latitude, longitude]) => ({ latitude, longitude }));
  } catch {
    return [];
  }
}
