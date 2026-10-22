import type { Trip } from '@/features/history/types';
import { ALLOWED_TRANSITIONS, useRideStore, type RideDraft } from '@/features/ride/store';
import type { CreatedRide } from '@/features/ride/types';
import type { RidePhase } from '@/types/ride';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const place = (n: number) => ({
  placeId: `p${n}`,
  title: `Place ${n}`,
  subtitle: '',
  location: { latitude: 40 + n / 100, longitude: 49.8 },
});
const DRAFT: RideDraft = { pickup: place(1), destination: place(2), vehicleType: 1 };
const CREATED: CreatedRide = {
  rideId: 2,
  status: 'searching',
  rawStatus: 'Searching',
  estimatedFare: 8,
  originalEstimatedFare: 10,
  discountAmount: 2,
  promo: null,
  distanceKm: 6,
  durationMinutes: 14,
};

const store = () => useRideStore.getState();
const order = () => store().startSearching(CREATED, DRAFT);

/** The table from .claude/skills/ride-flow, spelled out so a change to the store is noticed. */
const SPEC: Readonly<Record<RidePhase, readonly RidePhase[]>> = {
  idle: ['searching'],
  searching: [
    'driver_assigned',
    'driver_arrived',
    'in_progress',
    'completed',
    'cancelled',
    'no_driver',
  ],
  driver_assigned: ['driver_arrived', 'in_progress', 'completed', 'cancelled', 'searching'],
  driver_arrived: ['in_progress', 'completed', 'cancelled', 'searching'],
  in_progress: ['completed', 'cancelled'],
  no_driver: ['searching', 'cancelled'],
  completed: [],
  cancelled: [],
};
const ALL_PHASES = Object.keys(SPEC) as RidePhase[];

/** Puts the store in `phase` as if the ride got there through events. */
function enterPhase(phase: RidePhase): void {
  store().reset();
  if (phase === 'idle') return;
  order();
  useRideStore.setState({ phase, driverId: phase === 'searching' ? null : 4 });
}

/** Named transitions and the phase each one asks for. */
const ACTIONS: readonly { name: string; to: RidePhase; run: () => void }[] = [
  { name: 'startSearching', to: 'searching', run: () => order() },
  { name: 'driverAssigned', to: 'driver_assigned', run: () => store().driverAssigned({}) },
  { name: 'driverArrived', to: 'driver_arrived', run: () => store().driverArrived({}) },
  { name: 'rideStarted', to: 'in_progress', run: () => store().rideStarted({}) },
  { name: 'rideFinished', to: 'completed', run: () => store().rideFinished(5) },
  { name: 'rideCancelled', to: 'cancelled', run: () => store().rideCancelled('driver') },
  { name: 'noDriverFound', to: 'no_driver', run: () => store().noDriverFound() },
];

beforeEach(() => store().reset());
afterEach(() => jest.restoreAllMocks());

describe('transition spec', () => {
  it.each(ALL_PHASES)('%s allows exactly the transitions in the ride-flow skill', (from) => {
    expect([...ALLOWED_TRANSITIONS[from]].sort()).toEqual([...SPEC[from]].sort());
  });

  const cases = ALL_PHASES.flatMap((from) =>
    ACTIONS.filter((action) => action.to !== from).map(
      (action) => [from, action.name, action.to, SPEC[from].includes(action.to)] as const,
    ),
  );

  it.each(cases)('from %s, %s (to %s) is applied: %s', (from, name, to, allowed) => {
    enterPhase(from);
    const action = ACTIONS.find((a) => a.name === name);

    action?.run();

    expect(store().phase).toBe(allowed ? to : from);
  });

  it('a refused transition changes nothing (updatedAt, ETA)', () => {
    order();
    store().rideStarted({ etaMinutes: 4 });
    const at = store().updatedAt;

    store().driverArrived({ etaMinutes: 3 });

    expect(store()).toMatchObject({ phase: 'in_progress', updatedAt: at, etaMinutes: 4 });
  });

  it('a second order while searching (double tap) is refused', () => {
    order();

    expect(order()).toBe(false);
  });
});

describe('driverLost', () => {
  it.each(['driver_assigned', 'driver_arrived'] as const)(
    'from %s goes back to searching and forgets the driver',
    (phase) => {
      enterPhase(phase);
      store().updateRoute({
        toPickup: 'abc',
        trip: 'xyz',
        driverLocation: { latitude: 1, longitude: 1 },
      });

      store().driverLost();

      expect(store()).toMatchObject({
        phase: 'searching',
        driverId: null,
        driver: null,
        driverLocation: null,
        polylines: { toPickup: null, trip: 'xyz' },
        driverDropped: true,
      });
    },
  );

  it('restarts the search clock', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    order();
    store().driverAssigned({ driverId: 4 });
    now.mockReturnValue(5_000);

    store().driverLost();

    expect(store()).toMatchObject({ searchStartedAt: 5_000, updatedAt: 5_000 });
  });

  it.each(['idle', 'searching', 'in_progress', 'completed', 'cancelled', 'no_driver'] as const)(
    'is ignored in %s',
    (phase) => {
      enterPhase(phase);

      store().driverLost();

      expect(store()).toMatchObject({ phase, driverDropped: false });
    },
  );

  it('a new driver clears the "driver dropped" notice', () => {
    order();
    store().driverAssigned({ driverId: 4 });
    store().driverLost();

    store().driverAssigned({ driverId: 9 });

    expect(store()).toMatchObject({ phase: 'driver_assigned', driverId: 9, driverDropped: false });
  });
});

describe('etaAt', () => {
  it('is stamped when an ETA arrives and kept by updates without one', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    order();
    store().driverAssigned({ driverId: 4, etaMinutes: 8 });
    expect(store().etaAt).toBe(1_000);
    now.mockReturnValue(2_000);

    store().updateRoute({ driverLocation: { latitude: 1, longitude: 1 } });

    expect(store()).toMatchObject({ etaMinutes: 8, etaAt: 1_000 });
  });

  it('is re-stamped by a newer ETA in the same phase', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    order();
    store().driverAssigned({ driverId: 4, etaMinutes: 8 });
    now.mockReturnValue(61_000);

    store().updateRoute({ etaMinutes: 7 });

    expect(store()).toMatchObject({ etaMinutes: 7, etaAt: 61_000 });
  });

  it('is cleared with the ETA and distance on a new leg without them', () => {
    order();
    store().driverAssigned({ driverId: 4, etaMinutes: 8, remainingKm: 3 });

    store().driverArrived({});

    expect(store()).toMatchObject({ etaMinutes: null, etaAt: null, remainingKm: null });
  });
});

describe('updates outside an active ride', () => {
  it.each(['idle', 'completed', 'cancelled', 'no_driver'] as const)(
    'updateRoute does nothing in %s',
    (phase) => {
      enterPhase(phase);

      store().updateRoute({ etaMinutes: 3, trip: 'xyz' });

      expect(store()).toMatchObject({ etaMinutes: null, polylines: { trip: null } });
    },
  );

  it('ignores driver locations once the ride is over', () => {
    order();
    store().driverAssigned({ driverId: 4 });
    store().rideFinished(5);

    store().updateDriverLocation({ latitude: 9, longitude: 9 });

    expect(store().driverLocation).toBeNull();
  });
});

describe('fares', () => {
  it('rideFinished without a price leaves the final fare empty', () => {
    order();

    store().rideFinished(null);

    expect(store().fare).toMatchObject({ estimated: 8, final: null });
  });

  it('noDriverFound lets go of the ride id but keeps the fare', () => {
    order();

    store().noDriverFound();

    expect(store()).toMatchObject({ rideId: null, fare: { estimated: 8 } });
  });
});

describe('duplicate final events', () => {
  // Regression: a repeated final event used to be applied as a route refresh, so the hub's own
  // "Cancelled" overwrote the user's cancel reason and a second completion the charged fare.
  it('keeps who cancelled when a second cancel event arrives', () => {
    order();
    store().rideCancelled('user');

    store().rideCancelled('unknown');

    expect(store().cancelReason).toBe('user');
  });

  it('keeps the charged fare when a second completion arrives', () => {
    order();
    store().rideFinished(7.5);

    store().rideFinished(0);

    expect(store().fare?.final).toBe(7.5);
  });
});

describe('restore and finishFromHistory', () => {
  const SNAPSHOT = {
    rideId: 5,
    phase: 'searching' as const,
    driverId: null,
    vehicleType: 0 as const,
    fare: { estimated: 9, original: 9, discount: 0, promoCode: null, final: null },
    tripKm: 4,
    tripMinutes: 10,
    searchStartedAt: 1,
    updatedAt: 2,
  };
  const TRIP: Trip = {
    rideId: 5,
    driver: null,
    vehicle: null,
    pickupAddress: null,
    destinationAddress: null,
    pickupPoint: null,
    destinationPoint: null,
    fare: 12,
    discountAmount: 0,
    finalFare: 11,
    hasDiscount: false,
    date: null,
    status: 'cancelled',
  };

  it('restores without places (the hub fills them in later)', () => {
    store().restore(SNAPSHOT, null);

    expect(store()).toMatchObject({ phase: 'searching', pickup: null, destination: null });
  });

  it('restores with memory-only fields empty and hydrated untouched', () => {
    store().markHydrated(true);

    store().restore(SNAPSHOT, null);

    expect(store()).toMatchObject({
      hydrated: true,
      driverLocation: null,
      etaAt: null,
      driverDropped: false,
      polylines: { toPickup: null, trip: null },
    });
  });

  it('restore never clobbers a ride that already moved past idle', () => {
    order();
    store().driverAssigned({ driverId: 4 });

    store().restore({ ...SNAPSHOT, rideId: 99 }, null);

    expect(store()).toMatchObject({ rideId: 2, phase: 'driver_assigned', driverId: 4 });
  });

  it('finishFromHistory as cancelled keeps the quoted fare and an unknown reason', () => {
    store().restore(SNAPSHOT, null);

    store().finishFromHistory('cancelled', TRIP);

    expect(store()).toMatchObject({
      phase: 'cancelled',
      cancelReason: 'unknown',
      fare: { estimated: 9, final: null },
    });
  });

  it('finishFromHistory as completed without a local fare uses the trip prices', () => {
    store().restore(SNAPSHOT, null);
    useRideStore.setState({ fare: null });

    store().finishFromHistory('completed', { ...TRIP, status: 'completed' });

    expect(store().fare).toEqual({
      estimated: 11,
      original: 12,
      discount: 0,
      promoCode: null,
      final: 11,
    });
  });

  it('finishFromHistory cannot move a ride that is already final', () => {
    order();
    store().rideCancelled('user');

    store().finishFromHistory('completed', { ...TRIP, status: 'completed' });

    expect(store()).toMatchObject({ phase: 'cancelled', cancelReason: 'user' });
  });

  it('finishFromHistory as no_driver ends the search without a cancel reason', () => {
    store().restore(SNAPSHOT, null);

    store().finishFromHistory('no_driver', TRIP);

    expect(store()).toMatchObject({ phase: 'no_driver', cancelReason: null });
  });

  it('reset keeps hydrated (a reset is not a new app start)', () => {
    store().markHydrated(true);
    order();

    store().reset();

    expect(store()).toMatchObject({ phase: 'idle', rideId: null, hydrated: true });
  });
});
