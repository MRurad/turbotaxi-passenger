import { encode } from '@googlemaps/polyline-codec';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { estimateRoute } from '@/api/services/routes';
import { useRideRoute } from '@/features/ride/hooks/useRideRoute';
import { useRideStore } from '@/features/ride/store';
import { createQueryClient } from '@/providers/queryClient';

jest.mock('@/api/services/routes', () => ({ estimateRoute: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));

const STRAIGHT = encode([
  [40.41, 49.87],
  [40.3769, 49.8671],
]);
const ROAD = encode([
  [40.41, 49.87],
  [40.4, 49.868],
  [40.39, 49.867],
  [40.3769, 49.8671],
]);
const place = (latitude: number, longitude: number) => ({
  placeId: null,
  title: '',
  subtitle: '',
  location: { latitude, longitude },
});

function assignDriver(toPickup: string) {
  const store = useRideStore.getState();
  store.reset();
  store.startSearching(
    {
      rideId: 2,
      status: 'searching',
      rawStatus: 'Searching',
      estimatedFare: 5,
      originalEstimatedFare: 5,
      discountAmount: 0,
      promo: null,
      distanceKm: 4,
      durationMinutes: 9,
    },
    { pickup: place(40.3769, 49.8671), destination: place(40.4093, 49.8671), vehicleType: 1 },
  );
  store.driverAssigned({
    driverId: 4,
    driverLocation: { latitude: 40.41, longitude: 49.87 },
    toPickup,
  });
}

function setup() {
  const client = createQueryClient();
  // No cache GC timer left running after the test (Jest would not exit).
  client.setDefaultOptions({ queries: { gcTime: Infinity } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => jest.clearAllMocks());

describe('useRideRoute', () => {
  it('draws the backend route when it follows the roads', async () => {
    assignDriver(ROAD);
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useRideRoute(), { wrapper });
    expect(result.current).toBe(ROAD);
    expect(estimateRoute).not.toHaveBeenCalled();
    client.clear();
  });

  it('replaces a straight approach with a road route, fetched once from the car position', async () => {
    jest.mocked(estimateRoute).mockResolvedValue({
      distanceKm: 3.7,
      durationMinutes: 8,
      encodedPolyline: ROAD,
      price: { original: 0, discount: 0, final: 0, currency: 'AZN', hasDiscount: false },
    });
    assignDriver(STRAIGHT);
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useRideRoute(), { wrapper });
    expect(result.current).toBeNull(); // never a straight line, not even while loading
    await waitFor(() => expect(result.current).toBe(ROAD));
    expect(estimateRoute).toHaveBeenCalledTimes(1);
    expect(estimateRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: { latitude: 40.41, longitude: 49.87 },
        destination: { latitude: 40.3769, longitude: 49.8671 },
        vehicleType: 1,
      }),
      expect.anything(),
    );

    // The car moving on doesn't refetch.
    await act(async () => {
      useRideStore.getState().updateDriverLocation({ latitude: 40.405, longitude: 49.869 });
    });
    expect(estimateRoute).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('after a reload (no polyline yet) routes from the car and fills in the ETA', async () => {
    jest.mocked(estimateRoute).mockResolvedValue({
      distanceKm: 3.7,
      durationMinutes: 8,
      encodedPolyline: ROAD,
      price: { original: 0, discount: 0, final: 0, currency: 'AZN', hasDiscount: false },
    });
    const store = useRideStore.getState();
    store.reset();
    store.restore(
      {
        rideId: 2,
        phase: 'driver_assigned',
        driverId: 4,
        vehicleType: 1,
        fare: { estimated: 5, original: 5, discount: 0, promoCode: null, final: null },
        tripKm: 4,
        tripMinutes: 9,
        searchStartedAt: 1,
        updatedAt: Date.now(),
      },
      { pickup: place(40.3769, 49.8671), destination: place(40.4093, 49.8671) },
    );
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useRideRoute(), { wrapper });
    expect(estimateRoute).not.toHaveBeenCalled(); // waits for the car's position

    await act(async () => {
      useRideStore.getState().updateDriverLocation({ latitude: 40.41, longitude: 49.87 });
    });
    await waitFor(() => expect(result.current).toBe(ROAD));
    expect(useRideStore.getState().etaMinutes).toBe(8);
    client.clear();
  });
});
