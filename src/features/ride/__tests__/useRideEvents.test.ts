import { onlineManager } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ApiError } from '@/api/errors';
import { cancelRide } from '@/api/services/rides';
import {
  CANCEL_RETRY_DELAY_MS,
  SEARCH_TIMEOUT_GRACE_MS,
  SEARCH_TIMEOUT_MS,
} from '@/constants/timeouts';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useAuthStore } from '@/features/auth/store';
import { useRideEvents } from '@/features/ride/hooks/useRideEvents';
import { handleDriverLocation, handleRideUpdate } from '@/features/ride/rideEvents';
import type { RideSnapshot } from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';
import type { CreatedRide } from '@/features/ride/types';
import { i18n } from '@/i18n';
import { triggerHaptic } from '@/lib/haptics';
import {
  onUserHubEvent,
  subscribeToDriverLocation,
  unsubscribeFromDriverLocation,
  userHub,
} from '@/realtime/userHub';

const mockInvalidate = jest.fn(() => Promise.resolve());
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));

const mockOffs: jest.Mock[] = [];
const mockRemovers: jest.Mock[] = [];
jest.mock('@/realtime/userHub', () => ({
  onUserHubEvent: jest.fn(() => {
    const off = jest.fn();
    mockOffs.push(off);
    return off;
  }),
  subscribeToDriverLocation: jest.fn(() => Promise.resolve()),
  unsubscribeFromDriverLocation: jest.fn(() => Promise.resolve()),
  userHub: {
    getState: jest.fn(() => 'connected'),
    // Behaves like a connected hub: runs the action right away and returns a remover.
    addOnConnect: jest.fn((action: () => unknown) => {
      action();
      const remove = jest.fn();
      mockRemovers.push(remove);
      return remove;
    }),
  },
}));
jest.mock('@/api/services/rides', () => ({
  createRide: jest.fn(),
  cancelRide: jest.fn(() => Promise.resolve({ rideId: 3, status: 'cancelled' })),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

const NOW = 1_800_000_000_000;
const SIGNED_IN = { id: 7, name: '', surname: '', phoneNumber: '', email: '', createdAt: null };
const CREATED: CreatedRide = {
  rideId: 3,
  status: 'searching',
  rawStatus: 'Searching',
  estimatedFare: 6,
  originalEstimatedFare: 6,
  discountAmount: 0,
  promo: null,
  distanceKm: 4,
  durationMinutes: 9,
};
const startSearching = () =>
  useRideStore.getState().startSearching(CREATED, {
    pickup: { placeId: null, title: 'a', subtitle: '', location: { latitude: 1, longitude: 1 } },
    destination: {
      placeId: null,
      title: 'b',
      subtitle: '',
      location: { latitude: 2, longitude: 2 },
    },
    vehicleType: VEHICLE_TYPE.Economy,
  });
const searchingSnapshot = (searchStartedAt: number): RideSnapshot => ({
  rideId: 3,
  phase: 'searching',
  driverId: null,
  vehicleType: VEHICLE_TYPE.Economy,
  fare: { estimated: 6, original: 6, discount: 0, promoCode: null, final: null },
  tripKm: 4,
  tripMinutes: 9,
  searchStartedAt,
  updatedAt: searchStartedAt,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOffs.length = 0;
  mockRemovers.length = 0;
  useRideStore.getState().reset();
});

afterEach(() => {
  jest.useRealTimers();
  onlineManager.setOnline(true);
});

describe('useRideEvents hub handlers', () => {
  it('registers the ride status and driver location handlers on mount', async () => {
    await renderHook(() => useRideEvents());

    expect(onUserHubEvent).toHaveBeenCalledWith('rideStatusUpdated', handleRideUpdate);
    expect(onUserHubEvent).toHaveBeenCalledWith('driverLocationUpdated', handleDriverLocation);
  });

  it('removes both hub handlers on unmount', async () => {
    const { unmount } = await renderHook(() => useRideEvents());

    await unmount();

    expect(mockOffs).toHaveLength(2);
    mockOffs.forEach((off) => expect(off).toHaveBeenCalledTimes(1));
  });
});

describe('useRideEvents driver tracking', () => {
  it('does not subscribe to a driver while searching', async () => {
    startSearching();

    await renderHook(() => useRideEvents());

    expect(userHub.addOnConnect).not.toHaveBeenCalled();
  });

  it('adds an on-connect action that subscribes to the assigned driver', async () => {
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    expect(userHub.addOnConnect).toHaveBeenCalledTimes(1);
    expect(subscribeToDriverLocation).toHaveBeenCalledWith(42);
  });

  it('keeps one subscription while the driver arrives and the ride starts', async () => {
    startSearching();
    await renderHook(() => useRideEvents());
    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    await act(() => useRideStore.getState().driverArrived({}));
    await act(() => useRideStore.getState().rideStarted({}));

    expect(userHub.addOnConnect).toHaveBeenCalledTimes(1);
    expect(unsubscribeFromDriverLocation).not.toHaveBeenCalled();
  });

  it('removes the on-connect action and unsubscribes when the ride completes', async () => {
    startSearching();
    await renderHook(() => useRideEvents());
    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    await act(() => useRideStore.getState().rideFinished(6));

    expect(mockRemovers[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribeFromDriverLocation).toHaveBeenCalledWith(42);
  });

  it('removes the on-connect action and unsubscribes when the store resets', async () => {
    startSearching();
    await renderHook(() => useRideEvents());
    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    await act(() => useRideStore.getState().reset());

    expect(mockRemovers[0]).toHaveBeenCalledTimes(1);
    expect(unsubscribeFromDriverLocation).toHaveBeenCalledWith(42);
  });
});

describe('useRideEvents search timeout', () => {
  it('moves to no_driver once SEARCH_TIMEOUT_MS has passed since searchStartedAt', async () => {
    jest.useFakeTimers({ now: NOW });
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS - 1));
    expect(useRideStore.getState().phase).toBe('searching');

    await act(() => jest.advanceTimersByTime(1));
    expect(useRideStore.getState().phase).toBe('no_driver');
  });

  it('cancels the timed-out ride on the backend and lets go of its id', async () => {
    jest.useFakeTimers({ now: NOW });
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));

    expect(cancelRide).toHaveBeenCalledWith(3);
    expect(useRideStore.getState().rideId).toBeNull();
  });

  it('counts the timeout from a restored searchStartedAt, not from mount', async () => {
    jest.useFakeTimers({ now: NOW });
    useRideStore.getState().restore(searchingSnapshot(NOW - SEARCH_TIMEOUT_MS + 1_000), null);
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(1_000));

    expect(useRideStore.getState().phase).toBe('no_driver');
  });

  it('times out a restored, already-expired search immediately', async () => {
    jest.useFakeTimers({ now: NOW });
    useRideStore.getState().restore(searchingSnapshot(NOW - SEARCH_TIMEOUT_MS - 60_000), null);
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(0));

    expect(useRideStore.getState().phase).toBe('no_driver');
    expect(cancelRide).toHaveBeenCalledWith(3);
  });

  it('clears the timeout when a driver is assigned before it fires', async () => {
    jest.useFakeTimers({ now: NOW });
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));
    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));

    expect(useRideStore.getState().phase).toBe('driver_assigned');
    expect(cancelRide).not.toHaveBeenCalled();
  });

  it('waits for the hub to reconnect before giving up (an accept may be on its way)', async () => {
    jest.useFakeTimers({ now: NOW });
    jest.mocked(userHub.getState).mockReturnValue('reconnecting');
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS + SEARCH_TIMEOUT_GRACE_MS));
    expect(useRideStore.getState().phase).toBe('searching');

    jest.mocked(userHub.getState).mockReturnValue('connected');
    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_GRACE_MS));
    expect(useRideStore.getState().phase).toBe('no_driver');
  });

  it('retries a cancel that failed offline once the network is back', async () => {
    onlineManager.setOnline(false);
    jest.useFakeTimers({ now: NOW });
    jest.mocked(cancelRide).mockRejectedValueOnce(new ApiError({ code: 'network' }));
    useAuthStore.setState({ user: SIGNED_IN });
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));
    expect(cancelRide).toHaveBeenCalledTimes(1);

    await act(() => onlineManager.setOnline(true));
    expect(cancelRide).toHaveBeenCalledTimes(2);
    expect(cancelRide).toHaveBeenLastCalledWith(3);
  });

  it('drops that retry if the user signed out meanwhile', async () => {
    onlineManager.setOnline(false);
    jest.useFakeTimers({ now: NOW });
    jest.mocked(cancelRide).mockRejectedValueOnce(new ApiError({ code: 'network' }));
    useAuthStore.setState({ user: SIGNED_IN });
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));
    useAuthStore.setState({ user: null });
    await act(() => onlineManager.setOnline(true));

    expect(cancelRide).toHaveBeenCalledTimes(1);
  });
});

describe('useRideEvents after a ride', () => {
  it('refreshes trip history and promos when the ride completes', async () => {
    mockInvalidate.mockClear();
    useRideStore.getState().reset();
    useRideStore.getState().restore(
      {
        rideId: 5,
        phase: 'in_progress',
        driverId: 4,
        vehicleType: VEHICLE_TYPE.Comfort,
        fare: { estimated: 7, original: 7, discount: 0, promoCode: null, final: null },
        tripKm: 3,
        tripMinutes: 9,
        searchStartedAt: Date.now(),
        updatedAt: Date.now(),
      },
      null,
    );
    await renderHook(() => useRideEvents());
    await act(async () => useRideStore.getState().rideFinished(7));
    const keys = mockInvalidate.mock.calls.map((call) => JSON.stringify(call));
    expect(keys.join()).toContain('tripHistory');
    expect(keys.join()).toContain('promoList');
  });

  it('does not refresh history on non-final phase changes', async () => {
    mockInvalidate.mockClear();
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    expect(mockInvalidate).not.toHaveBeenCalled();
  });
});

describe('useRideEvents cancel retry when online', () => {
  it('retries a cancel that failed with a network error after CANCEL_RETRY_DELAY_MS', async () => {
    jest.useFakeTimers({ now: NOW });
    jest.mocked(cancelRide).mockRejectedValueOnce(new ApiError({ code: 'timeout' }));
    useAuthStore.setState({ user: SIGNED_IN });
    startSearching();
    await renderHook(() => useRideEvents());
    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));
    expect(cancelRide).toHaveBeenCalledTimes(1);

    await act(() => jest.advanceTimersByTime(CANCEL_RETRY_DELAY_MS));

    expect(cancelRide).toHaveBeenCalledTimes(2);
  });

  it('does not retry a cancel the backend rejected (not a network problem)', async () => {
    jest.useFakeTimers({ now: NOW });
    jest.mocked(cancelRide).mockRejectedValueOnce(new ApiError({ code: 'badRequest' }));
    useAuthStore.setState({ user: SIGNED_IN });
    startSearching();
    await renderHook(() => useRideEvents());
    await act(() => jest.advanceTimersByTime(SEARCH_TIMEOUT_MS));

    await act(() => jest.advanceTimersByTime(CANCEL_RETRY_DELAY_MS * 2));

    expect(cancelRide).toHaveBeenCalledTimes(1);
  });
});

describe('useRideEvents feedback', () => {
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
  });
  afterEach(() => announce.mockRestore());

  it('announces the new phase and gives a success haptic when a driver is assigned', async () => {
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().driverAssigned({ driverId: 42 }));

    expect(announce).toHaveBeenCalledWith(i18n.t('ride.status.driver_assigned'));
    expect(triggerHaptic).toHaveBeenCalledWith('success');
  });

  it('announces "driver dropped" with a warning haptic when the driver drops out', async () => {
    startSearching();
    useRideStore.getState().driverAssigned({ driverId: 42 });
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().driverLost());

    expect(announce).toHaveBeenCalledWith(i18n.t('ride.searching.driverDropped'));
    expect(triggerHaptic).toHaveBeenCalledWith('warning');
  });

  it('warns when the driver cancels', async () => {
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().rideCancelled('driver'));

    expect(triggerHaptic).toHaveBeenCalledWith('warning');
  });

  it('gives no haptic when the user cancelled themselves', async () => {
    startSearching();
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().rideCancelled('user'));

    expect(announce).toHaveBeenCalledWith(i18n.t('ride.status.cancelled'));
    expect(triggerHaptic).not.toHaveBeenCalled();
  });

  it('stays quiet on a restore (idle to an active phase)', async () => {
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().restore(searchingSnapshot(Date.now()), null));

    expect(announce).not.toHaveBeenCalled();
    expect(triggerHaptic).not.toHaveBeenCalled();
  });

  it('stays quiet on a route refresh without a phase change', async () => {
    startSearching();
    useRideStore.getState().driverAssigned({ driverId: 42 });
    await renderHook(() => useRideEvents());

    await act(() => useRideStore.getState().updateRoute({ etaMinutes: 3 }));

    expect(announce).not.toHaveBeenCalled();
  });
});
