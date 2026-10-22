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

export interface RouteAhead {
  /** From the point's nearest spot on the route to the route's end. */
  coordinates: LatLng[];
  /** How far the point is from the route (meters): large = the car left it. */
  offRouteMeters: number;
}

/**
 * The part of `route` still ahead of `point` (the car): the line shrinks as it drives. Uses a
 * local flat projection around the point, accurate enough at city scale.
 */
export function routeAhead(route: LatLng[], point: LatLng): RouteAhead {
  if (route.length < 2) return { coordinates: route, offRouteMeters: 0 };
  const metersPerDegLat = EARTH_RADIUS_M * DEG;
  const metersPerDegLng = metersPerDegLat * Math.cos(point.latitude * DEG);
  const toXY = (c: LatLng) => ({
    x: (c.longitude - point.longitude) * metersPerDegLng,
    y: (c.latitude - point.latitude) * metersPerDegLat,
  });
  let best = { index: 0, t: 0, distance: Infinity };
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = toXY(route[i] as LatLng);
    const b = toXY(route[i + 1] as LatLng);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    // The point is the origin: project it onto segment a→b.
    const t = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, -(a.x * dx + a.y * dy) / lengthSq));
    const distance = Math.hypot(a.x + t * dx, a.y + t * dy);
    if (distance < best.distance) best = { index: i, t, distance };
  }
  const a = route[best.index] as LatLng;
  const b = route[best.index + 1] as LatLng;
  const onRoute: LatLng = {
    latitude: a.latitude + best.t * (b.latitude - a.latitude),
    longitude: a.longitude + best.t * (b.longitude - a.longitude),
  };
  return {
    coordinates: [onRoute, ...route.slice(best.index + 1)],
    offRouteMeters: best.distance,
  };
}

/** "40.3769, 49.8671", "(40.3769 49.8671)", "40.3769;49.8671" → a point; anything else → null. */
const COORDS_TEXT = /^\s*\(?\s*(-?\d{1,3}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)\s*\)?\s*$/;

/** A coordinate pair written as text (e.g. an address field that holds only coordinates). */
export function parseCoordinates(text: string | null | undefined): LatLng | null {
  const match = text ? COORDS_TEXT.exec(text) : null;
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
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
