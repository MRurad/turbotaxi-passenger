import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { ACTIVE_RIDE_STALE_MS, RIDE_HISTORY_POLL_MS } from '@/constants/timeouts';
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
  pickupPoint: null,
  destinationPoint: null,
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

describe('safety-net polling', () => {
  afterEach(() => jest.useRealTimers());

  it('re-checks trip history while a ride is active and ends it there (e.g. driver cancel)', async () => {
    jest.useFakeTimers();
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    jest.mocked(loadRidePlaces).mockResolvedValue(PLACES);
    jest.mocked(checkPersistedRide).mockResolvedValue({ kind: 'restore', snapshot: snapshot() });
    const { unmount } = await renderHook(() => useRideRecovery());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(useRideStore.getState().phase).toBe('driver_assigned');

    const cancelled: RecoveryDecision = {
      kind: 'finished',
      phase: 'cancelled',
      trip: { ...TRIP, status: 'cancelled' },
    };
    jest.mocked(checkPersistedRide).mockResolvedValue(cancelled);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(RIDE_HISTORY_POLL_MS);
    });
    expect(useRideStore.getState().phase).toBe('cancelled');
    await unmount();
  });

  it('does not poll trip history while no ride is active', async () => {
    jest.useFakeTimers();
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);
    const { unmount } = await renderHook(() => useRideRecovery());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(RIDE_HISTORY_POLL_MS * 2);
    });

    expect(checkPersistedRide).not.toHaveBeenCalled();
    await unmount();
  });

  it('stops polling on unmount', async () => {
    jest.useFakeTimers();
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    const { unmount } = await renderHook(() => useRideRecovery());
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    const callsBefore = jest.mocked(checkPersistedRide).mock.calls.length;

    await unmount();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(RIDE_HISTORY_POLL_MS * 2);
    });

    expect(checkPersistedRide).toHaveBeenCalledTimes(callsBefore);
  });
});

describe('useRideRecovery foreground', () => {
  let appStateHandler: ((state: AppStateStatus) => void) | undefined;
  const removeAppState = jest.fn();

  beforeEach(() => {
    appStateHandler = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler;
      return { remove: removeAppState };
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it('re-checks an active ride when the app returns to the foreground', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    await renderHook(() => useRideRecovery());
    await flush();

    await act(async () => appStateHandler?.('active'));

    expect(checkPersistedRide).toHaveBeenCalledTimes(2);
  });

  it('does not check when the app goes to the background', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    await renderHook(() => useRideRecovery());
    await flush();

    await act(async () => appStateHandler?.('background'));

    expect(checkPersistedRide).toHaveBeenCalledTimes(1);
  });

  it('does not check on foreground without an active ride', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);
    await renderHook(() => useRideRecovery());
    await flush();

    await act(async () => appStateHandler?.('active'));

    expect(checkPersistedRide).not.toHaveBeenCalled();
  });

  it('removes the AppState listener on unmount', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(null);
    const { unmount } = await renderHook(() => useRideRecovery());

    await unmount();

    expect(removeAppState).toHaveBeenCalledTimes(1);
  });
});

describe('useRideRecovery robustness', () => {
  it('still marks the store hydrated when loading the snapshot fails', async () => {
    jest.mocked(loadRideSnapshot).mockRejectedValue(new Error('storage broken'));

    await renderHook(() => useRideRecovery());
    await flush();

    expect(useRideStore.getState()).toMatchObject({ hydrated: true, phase: 'idle' });
  });

  it('keeps the restored ride when the history check throws (cancelled / signed out)', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    jest.mocked(checkPersistedRide).mockRejectedValue(new Error('cancelled'));

    await renderHook(() => useRideRecovery());
    await flush();

    expect(useRideStore.getState()).toMatchObject({ phase: 'driver_assigned', hydrated: true });
  });

  it('resets the ride on an expired decision', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    jest.mocked(checkPersistedRide).mockResolvedValue({ kind: 'expired' });

    await renderHook(() => useRideRecovery());
    await flush();

    expect(useRideStore.getState()).toMatchObject({ phase: 'idle', rideId: null });
  });

  it('runs one history check at a time (a reconnect during a check is skipped)', async () => {
    jest.mocked(loadRideSnapshot).mockResolvedValue(snapshot());
    let resolveCheck: (decision: RecoveryDecision) => void = () => undefined;
    jest.mocked(checkPersistedRide).mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );
    await renderHook(() => useRideRecovery());
    await flush();
    const onConnect = jest.mocked(userHub.addOnConnect).mock.calls[0]?.[0];

    await act(async () => {
      await onConnect?.();
    });

    expect(checkPersistedRide).toHaveBeenCalledTimes(1);
    await act(async () => resolveCheck({ kind: 'restore', snapshot: snapshot() }));
  });

  it('neither restores nor hydrates when unmounted before the snapshot loads', async () => {
    let resolveLoad: (value: RideSnapshot | null) => void = () => undefined;
    jest.mocked(loadRideSnapshot).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const { unmount } = await renderHook(() => useRideRecovery());

    await unmount();
    await act(async () => resolveLoad(snapshot()));

    expect(useRideStore.getState()).toMatchObject({ phase: 'idle', hydrated: false });
    expect(checkPersistedRide).not.toHaveBeenCalled();
  });
});
