import * as Location from 'expo-location';

import { mapNativeAddress, nativeReverseGeocode } from '@/lib/nativeGeocode';

jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const POINT = { latitude: 40.4093, longitude: 49.8671 };
const EMPTY: Location.LocationGeocodedAddress = {
  city: null,
  district: null,
  streetNumber: null,
  street: null,
  region: null,
  subregion: null,
  country: null,
  postalCode: null,
  name: null,
  isoCountryCode: null,
  timezone: null,
  formattedAddress: null,
};

describe('mapNativeAddress', () => {
  it('uses street + number as the title and the city as the subtitle', () => {
    const place = mapNativeAddress(
      { ...EMPTY, street: 'Nizami küç.', streetNumber: '12', district: 'Səbail', city: 'Bakı' },
      POINT,
    );
    expect(place).toEqual({
      placeId: null,
      title: 'Nizami küç. 12',
      subtitle: 'Bakı',
      location: POINT,
    });
  });

  it('ignores a bare house number, plus codes and an empty city', () => {
    const place = mapNativeAddress(
      {
        ...EMPTY,
        streetNumber: '12',
        name: '8J6X+2M Baku',
        district: 'Səbail',
        city: '',
        region: 'Bakı',
      },
      POINT,
    );
    expect(place).toMatchObject({ title: 'Səbail', subtitle: 'Bakı' });
    expect(mapNativeAddress({ ...EMPTY, name: '12', district: 'Nərimanov' }, POINT)?.title).toBe(
      'Nərimanov',
    );
  });

  it('falls back to the name, then the district, and drops duplicates', () => {
    expect(mapNativeAddress({ ...EMPTY, name: 'Port Baku', city: 'Bakı' }, POINT)?.title).toBe(
      'Port Baku',
    );
    const district = mapNativeAddress({ ...EMPTY, district: 'Yasamal', city: 'Yasamal' }, POINT);
    expect(district).toMatchObject({ title: 'Yasamal', subtitle: '' });
  });

  it('returns null when there is nothing to show', () => {
    expect(mapNativeAddress({ ...EMPTY, city: 'Bakı' }, POINT)).toBeNull();
  });
});

describe('nativeReverseGeocode', () => {
  it('maps the first result and never throws', async () => {
    jest
      .mocked(Location.reverseGeocodeAsync)
      .mockResolvedValueOnce([{ ...EMPTY, street: 'Füzuli', streetNumber: '5' }]);
    await expect(nativeReverseGeocode(POINT)).resolves.toMatchObject({ title: 'Füzuli 5' });

    jest.mocked(Location.reverseGeocodeAsync).mockRejectedValueOnce(new Error('no permission'));
    await expect(nativeReverseGeocode(POINT)).resolves.toBeNull();
  });
});
