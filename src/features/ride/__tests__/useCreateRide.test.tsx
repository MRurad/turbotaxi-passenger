import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { ApiError } from '@/api/errors';
import { cancelRide, createRide } from '@/api/services/rides';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useAuthStore } from '@/features/auth/store';
import { useCreateRide } from '@/features/ride/hooks/useCreateRide';
import { useRideStore, type RideDraft } from '@/features/ride/store';
import type { CreatedRide } from '@/features/ride/types';
import { triggerHaptic } from '@/lib/haptics';
import { createQueryClient } from '@/providers/queryClient';
import type { Place } from '@/types/place';

jest.mock('@/api/services/rides', () => ({ createRide: jest.fn(), cancelRide: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

const place = (title: string, latitude: number, longitude: number): Place => ({
  placeId: null,
  title,
  subtitle: 'Baku',
  location: { latitude, longitude },
});
const DRAFT: RideDraft = {
  pickup: place('28 May St', 40.38, 49.85),
  destination: place('Airport', 40.46, 50.05),
  vehicleType: VEHICLE_TYPE.Comfort,
};
const created = (rideId: number): CreatedRide => ({
  rideId,
  status: 'searching',
  rawStatus: 'Searching',
  estimatedFare: 12.5,
  originalEstimatedFare: 15,
  discountAmount: 2.5,
  promo: { code: 'SPRING', remainingRides: 2 },
  distanceKm: 21,
  durationMinutes: 25,
});

let client: QueryClient;
const wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  useRideStore.getState().reset();
  useAuthStore.setState({ status: 'authenticated' });
  client = createQueryClient();
  // No GC timer left behind after the hook unmounts (it would keep the Jest worker alive).
  client.setMutationDefaults([], { gcTime: Infinity });
  jest.mocked(createRide).mockResolvedValue(created(77));
  jest.mocked(cancelRide).mockResolvedValue({ rideId: 77, status: 'cancelled' });
});

afterEach(() => {
  client.clear();
  useAuthStore.setState({ status: 'unauthenticated' });
});

describe('useCreateRide', () => {
  it('sends the draft coordinates and vehicle type to createRide', async () => {
    const { result } = await renderHook(() => useCreateRide(), { wrapper });

    await act(() => result.current.mutateAsync(DRAFT));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createRide).toHaveBeenCalledWith({
      pickup: DRAFT.pickup.location,
      destination: DRAFT.destination.location,
      vehicleType: VEHICLE_TYPE.Comfort,
    });
  });

  it('puts the store in searching with the created fare and the draft places when signed in', async () => {
    const { result } = await renderHook(() => useCreateRide(), { wrapper });

    await act(() => result.current.mutateAsync(DRAFT));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = useRideStore.getState();
    expect(state.phase).toBe('searching');
    expect(state.rideId).toBe(77);
    expect(state.pickup).toEqual(DRAFT.pickup);
    expect(state.destination).toEqual(DRAFT.destination);
    expect(state.vehicleType).toBe(VEHICLE_TYPE.Comfort);
    expect(state.fare).toEqual({
      estimated: 12.5,
      original: 15,
      discount: 2.5,
      promoCode: 'SPRING',
      final: null,
    });
    expect(state.tripKm).toBe(21);
    expect(state.tripMinutes).toBe(25);
    expect(state.searchStartedAt).not.toBeNull();
    expect(triggerHaptic).toHaveBeenCalledWith('success');
    expect(cancelRide).not.toHaveBeenCalled();
  });

  it('cancels the new ride when another ride is already active', async () => {
    useRideStore.getState().startSearching(created(5), DRAFT);
    const { result } = await renderHook(() => useCreateRide(), { wrapper });

    await act(() => result.current.mutateAsync(DRAFT));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(cancelRide).toHaveBeenCalledWith(77);
    expect(useRideStore.getState().rideId).toBe(5);
    expect(triggerHaptic).not.toHaveBeenCalled();
  });

  it('does not start searching or cancel when signed out before the order returned', async () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    const { result } = await renderHook(() => useCreateRide(), { wrapper });

    await act(() => result.current.mutateAsync(DRAFT));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useRideStore.getState().phase).toBe('idle');
    expect(cancelRide).not.toHaveBeenCalled();
    expect(triggerHaptic).not.toHaveBeenCalled();
  });

  it('leaves the store idle when createRide fails', async () => {
    jest.mocked(createRide).mockRejectedValue(new ApiError({ code: 'server', status: 500 }));
    const { result } = await renderHook(() => useCreateRide(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(DRAFT).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useRideStore.getState().phase).toBe('idle');
    expect(triggerHaptic).not.toHaveBeenCalled();
  });
});
