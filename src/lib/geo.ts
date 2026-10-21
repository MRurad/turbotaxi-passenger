import type { LatLng } from '@/types/geo';

const EARTH_RADIUS_M = 6_371_000;
const DEG = Math.PI / 180;
const FULL_TURN = 360;

/** Great-circle distance in meters. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = (b.latitude - a.latitude) * DEG;
  const dLng = (b.longitude - a.longitude) * DEG;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * DEG) * Math.cos(b.latitude * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b in degrees (0 = north, clockwise), for rotating the car. */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = a.latitude * DEG;
  const φ2 = b.latitude * DEG;
  const Δλ = (b.longitude - a.longitude) * DEG;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (((Math.atan2(y, x) / DEG) % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

/** Rounds coordinates (≈1 m at 5 decimals) so nearby pins share a cache key. */
export function roundCoords(c: LatLng, decimals = 5): LatLng {
  const f = 10 ** decimals;
  return { latitude: Math.round(c.latitude * f) / f, longitude: Math.round(c.longitude * f) / f };
}

export function sameCoords(a: LatLng | null | undefined, b: LatLng | null | undefined): boolean {
  if (!a || !b) return false;
  const ra = roundCoords(a);
  const rb = roundCoords(b);
  return ra.latitude === rb.latitude && ra.longitude === rb.longitude;
}
