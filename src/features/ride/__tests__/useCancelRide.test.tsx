import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { cancelRide } from '@/api/services/rides';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useCancelRide } from '@/features/ride/hooks/useCancelRide';
import { useRideStore } from '@/features/ride/store';
import type { CreatedRide } from '@/features/ride/types';
import { createQueryClient } from '@/providers/queryClient';
import type { Place } from '@/types/place';

jest.mock('@/api/services/rides', () => ({ createRide: jest.fn(), cancelRide: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

const place = (latitude: number): Place => ({
  placeId: null,
  title: 'x',
  subtitle: '',
  location: { latitude, longitude: 49.8 },
});
const created = (rideId: number): CreatedRide => ({
  rideId,
  status: 'searching',
  rawStatus: 'Searching',
  estimatedFare: 8,
  originalEstimatedFare: 8,
  discountAmount: 0,
  promo: null,
  distanceKm: 5,
  durationMinutes: 10,
});
const startSearchingRide = (rideId: number) =>
  useRideStore.getState().startSearching(created(rideId), {
    pickup: place(40.4),
    destination: place(40.5),
    vehicleType: VEHICLE_TYPE.Economy,
  });

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  useRideStore.getState().reset();
  client = createQueryClient();
  // No GC timer left behind after the hook unmounts (it would keep the Jest worker alive).
  client.setMutationDefaults([], { gcTime: Infinity });
});

afterEach(() => client.clear());

describe('useCancelRide', () => {
  it('moves the current ride to cancelled with reason user on success', async () => {
    startSearchingRide(10);
    jest.mocked(cancelRide).mockResolvedValue({ rideId: 10, status: 'cancelled' });
    const { result } = await renderHook(() => useCancelRide(), { wrapper });

    await act(() => result.current.mutateAsync(10));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cancelRide).toHaveBeenCalledWith(10);
    expect(useRideStore.getState().phase).toBe('cancelled');
    expect(useRideStore.getState().cancelReason).toBe('user');
  });

  it('leaves the store alone when the cancelled ride is no longer the current one', async () => {
    startSearchingRide(11);
    jest.mocked(cancelRide).mockResolvedValue({ rideId: 10, status: 'cancelled' });
    const { result } = await renderHook(() => useCancelRide(), { wrapper });

    await act(() => result.current.mutateAsync(10));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useRideStore.getState().phase).toBe('searching');
    expect(useRideStore.getState().rideId).toBe(11);
    expect(useRideStore.getState().cancelReason).toBeNull();
  });

  it('keeps the ride searching when the cancel request fails', async () => {
    startSearchingRide(10);
    jest.mocked(cancelRide).mockRejectedValue(new ApiError({ code: 'network' }));
    const { result } = await renderHook(() => useCancelRide(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(10).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useRideStore.getState().phase).toBe('searching');
  });
});
