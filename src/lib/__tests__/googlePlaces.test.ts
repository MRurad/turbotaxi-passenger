import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';

import { GOOGLE_FIELD_MASKS, GOOGLE_PLACES_PATHS } from '@/constants/google';
import { googleClient } from '@/lib/google/client';
import { mapReverseGeocode, mapSuggestions, splitAddress } from '@/lib/google/mappers';
import { autocomplete, placeDetails, reverseGeocode } from '@/lib/google/places';

jest.mock('@/constants/config', () => ({
  config: { API_URL: 'https://api.test', GOOGLE_MAPS_API_KEY: 'g-key' },
}));

const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const seen: InternalAxiosRequestConfig[] = [];

function respond(status: number, data: unknown): void {
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const response = { status, statusText: '', data, headers: {}, config };
    if (status >= 400) throw new AxiosError('fail', 'ERR_BAD_RESPONSE', config, {}, response);
    return response;
  };
  googleClient.defaults.adapter = adapter;
}

beforeEach(() => {
  seen.length = 0;
});

describe('google mappers', () => {
  it('splits a formatted address and drops the country', () => {
    expect(splitAddress('28 May St 12, Baku, Azerbaijan')).toEqual({
      title: '28 May St 12',
      subtitle: 'Baku',
    });
    expect(splitAddress('Baku, Azerbaijan')).toEqual({ title: 'Baku', subtitle: 'Azerbaijan' });
    expect(splitAddress('Azerbaijan')).toEqual({ title: 'Azerbaijan', subtitle: '' });
  });

  it('maps suggestions and skips empty ones', () => {
    expect(
      mapSuggestions({
        suggestions: [
          {
            placePrediction: {
              placeId: 'p1',
              structuredFormat: {
                mainText: { text: 'Port Baku' },
                secondaryText: { text: 'Baku' },
              },
            },
          },
          { placePrediction: { placeId: 'p2', text: { text: 'Nizami St' } } },
          { placePrediction: { placeId: 'p3' } },
          {},
        ],
      }),
    ).toEqual([
      { placeId: 'p1', title: 'Port Baku', subtitle: 'Baku' },
      { placeId: 'p2', title: 'Nizami St', subtitle: '' },
    ]);
  });

  it('prefers a street address over a plus code when reverse geocoding', () => {
    const place = mapReverseGeocode(
      {
        status: 'OK',
        results: [
          { formatted_address: '9GQ8+2M Baku', types: ['plus_code'] },
          {
            place_id: 'g1',
            formatted_address: '28 May St 12, Baku, Azerbaijan',
            types: ['street_address'],
          },
        ],
      },
      BAKU,
    );
    expect(place).toEqual({
      placeId: 'g1',
      title: '28 May St 12',
      subtitle: 'Baku',
      location: BAKU,
    });
  });
});

describe('Places API calls', () => {
  it('sends autocomplete with key, field mask, AZ region, language and bias', async () => {
    respond(200, { suggestions: [] });
    await autocomplete('Niz', 'token-1', BAKU, { language: 'ru' });

    const req = seen[0];
    expect(req?.url).toBe(GOOGLE_PLACES_PATHS.autocomplete);
    expect(req?.headers['X-Goog-Api-Key']).toBe('g-key');
    expect(req?.headers['X-Goog-FieldMask']).toBe(GOOGLE_FIELD_MASKS.autocomplete);
    expect(req?.headers.Authorization).toBeUndefined();
    expect(JSON.parse(String(req?.data))).toMatchObject({
      input: 'Niz',
      sessionToken: 'token-1',
      languageCode: 'ru',
      includedRegionCodes: ['az'],
      locationBias: { circle: { center: BAKU } },
    });
  });

  it('resolves details keeping the suggestion title', async () => {
    respond(200, {
      id: 'p1',
      formattedAddress: 'Neftchilar Ave 153, Baku, Azerbaijan',
      displayName: { text: 'Port Baku Towers' },
      location: BAKU,
    });
    const place = await placeDetails(
      { placeId: 'p1', title: 'Port Baku', subtitle: 'Neftchilar Ave' },
      'token-1',
      { language: 'en' },
    );
    expect(seen[0]?.params).toMatchObject({ sessionToken: 'token-1', languageCode: 'en' });
    expect(place).toEqual({
      placeId: 'p1',
      title: 'Port Baku',
      subtitle: 'Neftchilar Ave',
      location: BAKU,
    });
  });

  it('reverse geocodes, returns null for ZERO_RESULTS and errors on REQUEST_DENIED', async () => {
    respond(200, { status: 'ZERO_RESULTS', results: [] });
    await expect(reverseGeocode(BAKU, { language: 'az' })).resolves.toBeNull();
    expect(seen[0]?.params).toMatchObject({
      latlng: '40.4093,49.8671',
      language: 'az',
      key: 'g-key',
    });

    respond(200, { status: 'REQUEST_DENIED', error_message: 'API not enabled' });
    await expect(reverseGeocode(BAKU, { language: 'az' })).rejects.toMatchObject({
      code: 'server',
      serverMessage: 'API not enabled',
    });
  });

  it('rejects malformed Google payloads and maps HTTP errors to ApiError', async () => {
    respond(200, { suggestions: 'nope' });
    await expect(autocomplete('ab', 't', null, { language: 'en' })).rejects.toMatchObject({
      code: 'invalidResponse',
    });
    respond(403, { error: { message: 'key restricted' } });
    await expect(autocomplete('ab', 't', null, { language: 'en' })).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
