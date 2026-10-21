import { ApiError } from '@/api/errors';
import { resetGeocodeFallback, resolveAddress } from '@/features/map/hooks/useReverseGeocode';
import { reverseGeocode } from '@/lib/google/places';
import { nativeReverseGeocode } from '@/lib/nativeGeocode';

jest.mock('@/lib/google/places', () => ({ reverseGeocode: jest.fn() }));
jest.mock('@/lib/nativeGeocode', () => ({ nativeReverseGeocode: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const POINT = { latitude: 40.4, longitude: 49.8 };
const CTX = { language: 'az' as const };
const place = (title: string) => ({ placeId: null, title, subtitle: '', location: POINT });

beforeEach(() => {
  jest.clearAllMocks();
  resetGeocodeFallback();
});

describe('resolveAddress', () => {
  it('uses Google when it has a named address', async () => {
    jest.mocked(reverseGeocode).mockResolvedValue(place('Nizami 12'));
    await expect(resolveAddress(POINT, CTX)).resolves.toMatchObject({ title: 'Nizami 12' });
    expect(nativeReverseGeocode).not.toHaveBeenCalled();
  });

  it('falls back to the OS geocoder when Google has only an unnamed point', async () => {
    jest.mocked(nativeReverseGeocode).mockResolvedValue(place('Füzuli 5'));
    jest.mocked(reverseGeocode).mockResolvedValueOnce(place(''));
    await expect(resolveAddress(POINT, CTX)).resolves.toMatchObject({ title: 'Füzuli 5' });
  });

  it('after a refusal, uses the OS geocoder and skips Google for the session', async () => {
    jest.mocked(nativeReverseGeocode).mockResolvedValue(place('Füzuli 5'));
    jest
      .mocked(reverseGeocode)
      .mockRejectedValueOnce(new ApiError({ code: 'server', serverMessage: 'REQUEST_DENIED' }));
    await expect(resolveAddress(POINT, CTX)).resolves.toMatchObject({ title: 'Füzuli 5' });
    await expect(resolveAddress(POINT, CTX)).resolves.toMatchObject({ title: 'Füzuli 5' });
    expect(reverseGeocode).toHaveBeenCalledTimes(1);
  });

  it("rethrows Google's refusal only when the fallback has nothing", async () => {
    jest.mocked(nativeReverseGeocode).mockResolvedValue(null);
    jest.mocked(reverseGeocode).mockRejectedValueOnce(new ApiError({ code: 'server' }));
    await expect(resolveAddress(POINT, CTX)).rejects.toMatchObject({ code: 'server' });
  });

  it('rethrows network errors and cancellations without falling back (the query retries)', async () => {
    jest.mocked(reverseGeocode).mockRejectedValueOnce(new ApiError({ code: 'network' }));
    await expect(resolveAddress(POINT, CTX)).rejects.toMatchObject({ code: 'network' });
    jest.mocked(reverseGeocode).mockRejectedValueOnce(new ApiError({ code: 'cancelled' }));
    await expect(resolveAddress(POINT, CTX)).rejects.toMatchObject({ code: 'cancelled' });
    expect(nativeReverseGeocode).not.toHaveBeenCalled();
  });
});
