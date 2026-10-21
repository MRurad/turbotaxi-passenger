import { act, renderHook } from '@testing-library/react-native';

import { ACTIVE_RIDE_STALE_MS } from '@/constants/timeouts';
import { VEHICLE_TYPE } from '@/constants/vehicles';
import type { Trip } from '@/features/history/types';
import { useRideRecovery } from '@/features/ride/hooks/useRideRecovery';
import { checkPersistedRide, type RecoveryDecision } from '@/features/ride/recovery';
import { handleRideUpdate, resetPendingRideUpdates } from '@/features/ride/rideEvents';
import {
  clearRidePlaces,
  clearRideSnapshot,
  loadRidePlaces,
  loadRideSnapshot,
  type RidePlaces,
  type RideSnapshot,
} from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';
import { rideStatusUpdatedSchema } from '@/realtime/events';
import { userHub } from '@/realtime/userHub';

jest.mock('@/features/ride/snapshot', () => ({
  ...jest.requireActual<typeof import('@/features/ride/snapshot')>('@/features/ride/snapshot'),
  loadRideSnapshot: jest.fn(),
  loadRidePlaces: jest.fn(),
  saveRideSnapshot: jest.fn(() => Promise.resolve()),
  saveRidePlaces: jest.fn(() => Promise.resolve()),
  clearRideSnapshot: jest.fn(() => Promise.resolve()),
  clearRidePlaces: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/ride/recovery', () => ({
  ...jest.requireActual<typeof import('@/features/ride/recovery')>('@/features/ride/recovery'),
  checkPersistedRide: jest.fn(),
}));
jest.mock('@/api/services/tripHistory', () => ({ getTripHistory: jest.fn() }));
const mockRemoveOnConnect = jest.fn();
jest.mock('@/realtime/userHub', () => ({
  userHub: { addOnConnect: jest.fn(() => mockRemoveOnConnect) },
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('@/lib/haptics', () => ({ triggerHaptic: jest.fn() }));

const snapshot = (overrides: Partial<RideSnapshot> = {}): RideSnapshot => ({
  rideId: 9,
  phase: 'driver_assigned',
  driverId: 4,
  vehicleType: VEHICLE_TYPE.Comfort,
  fare: { estimated: 7, original: 8, discount: 1, promoCode: 'X', final: null },
  tripKm: 6,
  tripMinutes: 12,
  searchStartedAt: Date.now() - 120_000,
  updatedAt: Date.now() - 60_000,
  ...overrides,
});
const PLACES: RidePlaces = {
  pickup: {
    placeId: 'p1',
    title: 'Home',
    subtitle: '',
    location: { latitude: 40.4, longitude: 49.8 },
  },
  destination: {
    placeId: 'p2',
    title: 'Work',
    subtitle: '',
    location: { latitude: 40.5, longitude: 49.9 },
  },
};
const TRIP: Trip = {
  rideId: 9,
  driver: null,
  vehicle: null,
  pickupAddress: null,
  destinationAddress: null,
  fare: 8,
  discountAmount: 1,
  finalFare: 7.5,
  hasDiscount: true,
  date: null,
  status: 'completed',
};

/** Lets the restore's awaited promises settle. */
const flush = () => act(async () => {});

beforeEach(() => {
  jest.clearAllMocks();
  useRideStore.getState().reset();
  resetPendingRideUpdates();
  jest.mocked(loadRidePlaces).mockResolvedValue(PLACES);
  jest
    .mocked(checkPersistedRide)
    .mockImplementation((checked) =>
      Promise.resolve(checked ? { kind: 'restore', snapshot: checked } : { kind: 'none' }),
    );
});

describe('useRideRecovery restore', () => {
  it('restores a persisted active snapshot and its places onto an idle store', async () => {
    const persisted = snapshot();
    jest.mocked(loadRideSnapshot).mockResolvedValue(persisted);

    await renderHook(() => useRideRecovery());
    await flush();

    const state = useRideStore.getState();
    expect(state.phase).toBe('driver_assigned');
    expect(state.rideId).toBe(9);
    expect(state.driverId).toBe(4);
    expect(state.fare).toEqual(persisted.fare);
    expect(state.pickup).toEqual(PLACES.pickup);
    expect(state.destination).toEqual(PLACES.destination);
  });

  it('checks the restored ride against trip history', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());

    await renderHook(() => useRideRecovery());
    await flush();

    expect(checkPersistedRide).toHaveBeenCalledWith(
      expect.objectContaining({ rideId: 9 }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('does nothing when no snapshot is persisted', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);

    await renderHook(() => useRideRecovery());
    await flush();

    expect(useRideStore.getState().phase).toBe('idle');
    expect(checkPersistedRide).not.toHaveBeenCalled();
  });

  it('clears an expired snapshot without restoring it', async () => {
    const old = Date.now() - ACTIVE_RIDE_STALE_MS - 60_000;
    jest
      .mocked(loadRideSnapshot)
      .mockResolvedValue(snapshot({ searchStartedAt: old, updatedAt: old }));
    const phases: string[] = [];
    const unsubscribe = useRideStore.subscribe((s) => {
      phases.push(s.phase);
    });

    await renderHook(() => useRideRecovery());
    await flush();
    unsubscribe();

    expect(useRideStore.getState().phase).toBe('idle');
    expect(phases.filter((phase) => phase !== 'idle')).toEqual([]);
    expect(clearRideSnapshot).toHaveBeenCalled();
    expect(clearRidePlaces).toHaveBeenCalled();
    expect(checkPersistedRide).not.toHaveBeenCalled();
  });

  it('does not overwrite a ride that started before the snapshot loaded', async () => {
    let resolveLoad: (value: RideSnapshot | null) => void = () => undefined;
    jest.mocked(loadRideSnapshot).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    await renderHook(() => useRideRecovery());
    useRideStore.getState().restore(snapshot({ rideId: 50, phase: 'searching' }), null);

    await act(async () => resolveLoad(snapshot()));

    expect(useRideStore.getState().rideId).toBe(50);
  });
});

describe('useRideRecovery hydration', () => {
  it('holds a hub event that arrives before the restore and replays it afterwards', async () => {
    let resolveLoad: (value: RideSnapshot | null) => void = () => undefined;
    jest.mocked(loadRideSnapshot).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    await renderHook(() => useRideRecovery());
    handleRideUpdate(
      rideStatusUpdatedSchema.parse([
        9,
        'ride_update',
        { rideId: 9, status: 'Arrived', driverId: 4 },
      ]),
    );
    expect(useRideStore.getState().phase).toBe('idle');

    await act(async () => resolveLoad(snapshot({ phase: 'driver_assigned' })));
    await flush();

    expect(useRideStore.getState().hydrated).toBe(true);
    expect(useRideStore.getState().phase).toBe('driver_arrived');
  });

  it('marks the store hydrated when there is nothing to restore', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);

    await renderHook(() => useRideRecovery());
    await flush();

    expect(useRideStore.getState().hydrated).toBe(true);
  });

  it('marks the store not hydrated again on unmount', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);
    const { unmount } = await renderHook(() => useRideRecovery());
    await flush();

    await unmount();

    expect(useRideStore.getState().hydrated).toBe(false);
  });
});

describe('useRideRecovery decisions', () => {
  it('moves the store to completed on a finished decision', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot({ phase: 'in_progress' }));
    jest
      .mocked(checkPersistedRide)
      .mockResolvedValue({ kind: 'finished', phase: 'completed', trip: TRIP });

    await renderHook(() => useRideRecovery());
    await flush();

    const state = useRideStore.getState();
    expect(state.phase).toBe('completed');
    expect(state.fare?.final).toBe(7.5);
  });

  it('ignores a decision when the ride moved on during the history check', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot({ phase: 'driver_assigned' }));
    let resolveCheck: (decision: RecoveryDecision) => void = () => undefined;
    jest.mocked(checkPersistedRide).mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );
    await renderHook(() => useRideRecovery());
    await flush();
    expect(checkPersistedRide).toHaveBeenCalledTimes(1);
    // A hub event lands while trip history is still loading (a later updatedAt).
    const later = Date.now() + 5_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(later);
    useRideStore.getState().driverArrived({});
    nowSpy.mockRestore();

    await act(async () => resolveCheck({ kind: 'finished', phase: 'cancelled', trip: TRIP }));

    expect(useRideStore.getState().phase).toBe('driver_arrived');
  });
});

describe('useRideRecovery hub lifecycle', () => {
  it('re-checks the ride on every hub (re)connect', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    await renderHook(() => useRideRecovery());
    await flush();
    const onConnect = jest.mocked(userHub.addOnConnect).mock.calls[0]?.[0];
    expect(onConnect).toBeDefined();

    await act(async () => {
      await onConnect?.();
    });

    expect(checkPersistedRide).toHaveBeenCalledTimes(2);
  });

  it('removes the on-connect action on unmount', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);
    const { unmount } = await renderHook(() => useRideRecovery());

    await unmount();

    expect(mockRemoveOnConnect).toHaveBeenCalledTimes(1);
  });
});
