import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { mapTrip } from '@/api/mappers/tripHistory';
import { parseCoordinates } from '@/lib/geo';
import { photonClient } from '@/lib/photon/client';
import { mapPhotonSuggestions } from '@/lib/photon/mappers';
import { autocomplete, placeDetails, reverseGeocode } from '@/lib/photon/places';
import type { PhotonFeature } from '@/lib/photon/schemas';

const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const seen: InternalAxiosRequestConfig[] = [];

function respond(status: number, data: unknown): void {
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const response = { status, statusText: '', data, headers: {}, config };
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    return response;
  };
  photonClient.defaults.adapter = adapter;
}

// Trimmed from real photon.komoot.io answers (2026-10-22).
const station = (lng: number, id: number): PhotonFeature => ({
  geometry: { coordinates: [lng, 40.3998793] },
  properties: {
    osm_type: 'N',
    osm_id: id,
    name: 'Gənclik',
    street: 'Əhmədbəy Ağaoğlu küçəsi',
    district: 'Nərimanov rayonu',
    city: 'Bakı',
  },
});
const HOUSE: PhotonFeature = {
  geometry: { coordinates: [49.8674293, 40.3770751] },
  properties: {
    osm_type: 'W',
    osm_id: 180350026,
    housenumber: '5',
    street: '8 Noyabr pr.',
    city: 'Bakı',
  },
};

beforeEach(() => {
  seen.length = 0;
});

describe('photon mappers', () => {
  it('names a place, puts street + area in the subtitle and drops duplicates', () => {
    const [first, ...rest] = mapPhotonSuggestions([station(49.850956, 1), station(49.8505, 2)]);
    expect(rest).toHaveLength(0);
    expect(first).toEqual({
      placeId: 'osm:N1',
      title: 'Gənclik',
      subtitle: 'Əhmədbəy Ağaoğlu küçəsi, Nərimanov rayonu, Bakı',
      location: { latitude: 40.3998793, longitude: 49.850956 },
    });
  });

  it('uses "street number" as the title of an unnamed building', () => {
    expect(mapPhotonSuggestions([HOUSE])[0]).toMatchObject({
      title: '8 Noyabr pr. 5',
      subtitle: 'Bakı',
    });
  });
});

describe('photon requests', () => {
  it('searches Azerbaijan near the user, local names unless the app is in English', async () => {
    respond(200, { features: [HOUSE] });
    await autocomplete('8 noy', 'token', BAKU, { language: 'az' });
    expect(seen[0]?.params).toMatchObject({
      q: '8 noy',
      lang: 'default',
      lat: BAKU.latitude,
      lon: BAKU.longitude,
    });
    expect(seen[0]?.params.bbox).toBeDefined();

    await autocomplete('8 noy', 'token', null, { language: 'en' });
    expect(seen[1]?.params).toMatchObject({ lang: 'en' });
    expect(seen[1]?.params.lat).toBeUndefined();
  });

  it('resolves a picked suggestion without another request', async () => {
    respond(200, { features: [] });
    const [suggestion] = mapPhotonSuggestions([HOUSE]);
    if (!suggestion) throw new Error('no suggestion');
    await expect(placeDetails(suggestion, 'token', { language: 'az' })).resolves.toMatchObject({
      title: '8 Noyabr pr. 5',
      location: { latitude: 40.3770751, longitude: 49.8674293 },
    });
    expect(seen).toHaveLength(0);
  });

  it('reverse geocodes, skipping transit stops, and keeps the exact point', async () => {
    respond(200, { features: [HOUSE] });
    const place = await reverseGeocode(BAKU, { language: 'ru' });
    expect(place).toMatchObject({ title: '8 Noyabr pr. 5', location: BAKU });
    expect(seen[0]?.params.osm_tag).toEqual(['!highway:bus_stop', '!public_transport']);
    expect(photonClient.getUri(seen[0])).toContain('osm_tag=!highway');
  });

  it('returns null when there is nothing nearby, and rejects a malformed payload', async () => {
    respond(200, { features: [] });
    await expect(reverseGeocode(BAKU, { language: 'az' })).resolves.toBeNull();
    respond(200, { nope: true });
    await expect(reverseGeocode(BAKU, { language: 'az' })).rejects.toMatchObject({
      code: 'invalidResponse',
    });
  });
});

describe('coordinates in trip addresses', () => {
  it('recognises coordinate text and nothing else', () => {
    expect(parseCoordinates('40.3769, 49.8671')).toEqual({ latitude: 40.3769, longitude: 49.8671 });
    expect(parseCoordinates('(40.3769 49.8671)')).toEqual({
      latitude: 40.3769,
      longitude: 49.8671,
    });
    expect(parseCoordinates('Nizami küç. 12')).toBeNull();
    expect(parseCoordinates('28 May 12, 5')).toBeNull();
    expect(parseCoordinates(null)).toBeNull();
  });

  it('maps a coordinates-only address to a point to name, a real one stays text', () => {
    const trip = mapTrip({
      rideId: 4,
      pickupAddress: '40.3769,49.8671',
      destinationAddress: 'Gənclik m/st',
      fare: 5,
      status: 'Completed',
    });
    expect(trip).toMatchObject({
      pickupAddress: null,
      pickupPoint: { latitude: 40.3769, longitude: 49.8671 },
      destinationAddress: 'Gənclik m/st',
      destinationPoint: null,
    });
  });
});
