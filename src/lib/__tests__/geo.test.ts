import { encode } from '@googlemaps/polyline-codec';

import { bearingDegrees, distanceMeters, roundCoords, sameCoords } from '@/lib/geo';
import { decodePolyline } from '@/lib/polyline';

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
