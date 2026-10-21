import { apiClient } from '@/api/client';
import { ApiError } from '@/api/errors';
import { mapRideDriver } from '@/api/mappers/drivers';
import { getRideDriver } from '@/api/services/drivers';
import { mergeDriver } from '@/features/ride/utils';

jest.mock('@/api/client', () => ({ apiClient: { get: jest.fn() } }));

const DRIVER = { id: 4, userId: 11, vehicleId: 3 };
const USER = { id: 11, name: 'Elvin', surname: 'Məmmədov', phoneNumber: '+994501234567' };
const VEHICLE = {
  id: 3,
  plateNumber: '10-AB-123',
  brand: 'Toyota',
  model: 'Prius',
  color: 'White',
};

function mockGet(routes: Record<string, unknown>) {
  jest
    .mocked(apiClient.get)
    .mockImplementation((url: string) =>
      url in routes
        ? Promise.resolve({ data: routes[url] })
        : Promise.reject(new ApiError({ code: 'forbidden', status: 403 })),
    );
}

beforeEach(() => jest.clearAllMocks());

describe('getRideDriver', () => {
  it('assembles name, phone and car from driver → user + vehicle', async () => {
    mockGet({ '/api/Drivers/4': DRIVER, '/api/Users/11': USER, '/api/Vehicles/3': VEHICLE });
    await expect(getRideDriver(4)).resolves.toEqual({
      name: 'Elvin Məmmədov',
      phoneNumber: '+994501234567',
      plateNumber: '10-AB-123',
      brand: 'Toyota',
      model: 'Prius',
      color: 'White',
    });
  });

  it('keeps what it could get when the user or vehicle lookup fails', async () => {
    mockGet({ '/api/Drivers/4': DRIVER, '/api/Vehicles/3': VEHICLE });
    await expect(getRideDriver(4)).resolves.toMatchObject({
      name: null,
      phoneNumber: null,
      plateNumber: '10-AB-123',
    });
  });

  it('fails (and retries) on a transient error instead of caching an empty card', async () => {
    jest
      .mocked(apiClient.get)
      .mockImplementation((url: string) =>
        url === '/api/Drivers/4'
          ? Promise.resolve({ data: DRIVER })
          : Promise.reject(new ApiError({ code: 'network' })),
      );
    await expect(getRideDriver(4)).rejects.toMatchObject({ code: 'network' });
  });

  it('fails when the driver itself is not readable (the card shows its fallback)', async () => {
    mockGet({});
    await expect(getRideDriver(4)).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('mapRideDriver / mergeDriver', () => {
  it('trims empty values to null', () => {
    expect(mapRideDriver({ name: ' ', surname: null }, null)).toMatchObject({
      name: null,
      brand: null,
    });
  });

  it('prefers hub details field by field, the profile fills the gaps', () => {
    const fromProfile = mapRideDriver(USER, VEHICLE);
    const fromEvents = { ...mapRideDriver(null, null), plateNumber: '99-ZZ-999' };
    expect(mergeDriver(fromEvents, fromProfile)).toMatchObject({
      name: 'Elvin Məmmədov',
      plateNumber: '99-ZZ-999',
    });
    expect(mergeDriver(null, fromProfile)).toBe(fromProfile);
    expect(mergeDriver(null, null)).toBeNull();
  });
});
