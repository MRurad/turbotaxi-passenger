import { encode } from '@googlemaps/polyline-codec';

import { bearingDegrees, distanceMeters, roundCoords, routeAhead, sameCoords } from '@/lib/geo';
import { decodePolyline } from '@/lib/polyline';
import type { LatLng } from '@/types/geo';

const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const AIRPORT = { latitude: 40.4675, longitude: 50.0467 };

describe('geo', () => {
  it('computes great-circle distance', () => {
    const km = distanceMeters(BAKU, AIRPORT) / 1000;
    expect(km).toBeGreaterThan(16);
    expect(km).toBeLessThan(17);
    expect(distanceMeters(BAKU, BAKU)).toBe(0);
  });

  it('computes bearings in 0–360', () => {
    expect(bearingDegrees(BAKU, { ...BAKU, latitude: BAKU.latitude + 1 })).toBeCloseTo(0, 0);
    expect(bearingDegrees(BAKU, { ...BAKU, longitude: BAKU.longitude + 0.01 })).toBeCloseTo(90, 0);
    expect(bearingDegrees(BAKU, { ...BAKU, latitude: BAKU.latitude - 1 })).toBeCloseTo(180, 0);
    expect(bearingDegrees(BAKU, { ...BAKU, longitude: BAKU.longitude - 0.01 })).toBeCloseTo(270, 0);
  });

  it('rounds and compares coordinates', () => {
    expect(roundCoords({ latitude: 40.123456789, longitude: 49.987654321 })).toEqual({
      latitude: 40.12346,
      longitude: 49.98765,
    });
    expect(sameCoords(BAKU, { latitude: 40.409301, longitude: 49.867099 })).toBe(true);
    expect(sameCoords(BAKU, AIRPORT)).toBe(false);
    expect(sameCoords(BAKU, null)).toBe(false);
  });
});

describe('routeAhead', () => {
  // A route going north, then east (≈1.1 km per leg).
  const ROUTE = [
    { latitude: 40.4, longitude: 49.85 },
    { latitude: 40.41, longitude: 49.85 },
    { latitude: 40.41, longitude: 49.863 },
  ];

  it('drops what the car has passed and starts the line on the route next to it', () => {
    const car = { latitude: 40.405, longitude: 49.8501 }; // halfway up the first leg, ~8 m off
    const ahead = routeAhead(ROUTE, car);
    expect(ahead.coordinates).toHaveLength(3);
    expect(ahead.coordinates[0]?.latitude).toBeCloseTo(40.405, 5);
    expect(ahead.coordinates[0]?.longitude).toBeCloseTo(49.85, 5);
    expect(ahead.coordinates.slice(1)).toEqual(ROUTE.slice(1));
    expect(ahead.offRouteMeters).toBeLessThan(10);
  });

  it('keeps only the last leg once the car has turned the corner', () => {
    const ahead = routeAhead(ROUTE, { latitude: 40.41, longitude: 49.857 });
    expect(ahead.coordinates).toEqual([{ latitude: 40.41, longitude: 49.857 }, ROUTE[2]]);
  });

  it('reports how far a car that left the route is from it', () => {
    const away = routeAhead(ROUTE, { latitude: 40.405, longitude: 49.84 }); // ~850 m west
    expect(away.offRouteMeters).toBeGreaterThan(800);
    expect(away.offRouteMeters).toBeLessThan(900);
  });

  it('leaves a route without segments as it is', () => {
    expect(routeAhead([ROUTE[0] as LatLng], BAKU)).toEqual({
      coordinates: [ROUTE[0]],
      offRouteMeters: 0,
    });
  });
});

describe('decodePolyline', () => {
  it('decodes a Google encoded polyline', () => {
    const encoded = encode([
      [BAKU.latitude, BAKU.longitude],
      [AIRPORT.latitude, AIRPORT.longitude],
    ]);
    expect(decodePolyline(encoded)).toEqual([BAKU, AIRPORT]);
  });

  it('returns an empty route for missing input', () => {
    expect(decodePolyline(null)).toEqual([]);
    expect(decodePolyline('')).toEqual([]);
  });
});
