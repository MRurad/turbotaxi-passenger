import { renderHook } from '@testing-library/react-native';
import { useRouter, useSegments } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useAuthStore } from '@/features/auth/store';
import { useRideRouteGuard } from '@/features/ride/hooks/useRideRouteGuard';
import { useRideStore } from '@/features/ride/store';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: mockReplace })),
  useSegments: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

type Segments = ReturnType<typeof useSegments>;
const setSegments = (segments: string[]) =>
  jest.mocked(useSegments).mockReturnValue(segments as unknown as Segments);

const startSearching = () =>
  useRideStore.getState().startSearching(
    {
      rideId: 1,
      status: 'searching',
      rawStatus: 'Searching',
      estimatedFare: 5,
      originalEstimatedFare: 5,
      discountAmount: 0,
      promo: null,
      distanceKm: 2,
      durationMinutes: 4,
    },
    {
      pickup: { placeId: null, title: 'a', subtitle: '', location: { latitude: 1, longitude: 1 } },
      destination: {
        placeId: null,
        title: 'b',
        subtitle: '',
        location: { latitude: 2, longitude: 2 },
      },
      vehicleType: VEHICLE_TYPE.Economy,
    },
  );

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useRouter)
    .mockReturnValue({ replace: mockReplace } as unknown as ReturnType<typeof useRouter>);
  useRideStore.getState().reset();
  useAuthStore.setState({ status: 'authenticated' });
});

afterEach(() => useAuthStore.setState({ status: 'unauthenticated' }));

describe('useRideRouteGuard', () => {
  it('redirects to the ride screen when searching on the home segments', async () => {
    startSearching();
    setSegments(['(app)']);

    await renderHook(() => useRideRouteGuard());

    expect(mockReplace).toHaveBeenCalledWith(ROUTES.ride);
  });

  it('does not navigate when searching and already on the ride screen', async () => {
    startSearching();
    setSegments(['(app)', 'ride']);

    await renderHook(() => useRideRouteGuard());

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while signed out, leaving navigation to the auth guard', async () => {
    useAuthStore.setState({ status: 'unauthenticated' });
    startSearching();
    setSegments(['(app)']);

    await renderHook(() => useRideRouteGuard());

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not navigate when idle on home', async () => {
    setSegments(['(app)']);

    await renderHook(() => useRideRouteGuard());

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
