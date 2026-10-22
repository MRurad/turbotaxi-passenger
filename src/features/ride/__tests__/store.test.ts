import type { Trip } from '@/features/history/types';
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  hasActiveRide,
  useRideStore,
  type RideDraft,
} from '@/features/ride/store';
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
  promo: { code: 'WELCOME', remainingRides: 2 },
  distanceKm: 6,
  durationMinutes: 14,
};
const ALL_PHASES = Object.keys(ALLOWED_TRANSITIONS) as RidePhase[];

const store = () => useRideStore.getState();
const order = () => store().startSearching(CREATED, DRAFT);

beforeEach(() => store().reset());

describe('transition table', () => {
  it('allows exactly the listed transitions', () => {
    for (const from of ALL_PHASES) {
      for (const to of ALL_PHASES) {
        expect(canTransition(from, to)).toBe(ALLOWED_TRANSITIONS[from].includes(to));
      }
    }
  });

  it('final phases go nowhere but reset', () => {
    expect(ALLOWED_TRANSITIONS.completed).toEqual([]);
    expect(ALLOWED_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('ride lifecycle', () => {
  it('starts searching from the order with the fare and places', () => {
    order();
    expect(store()).toMatchObject({
      phase: 'searching',
      rideId: 2,
      vehicleType: 1,
      pickup: { placeId: 'p1' },
      destination: { placeId: 'p2' },
      fare: { estimated: 8, original: 10, discount: 2, promoCode: 'WELCOME', final: null },
      tripKm: 6,
      tripMinutes: 14,
    });
    expect(store().searchStartedAt).not.toBeNull();
    expect(hasActiveRide()).toBe(true);
  });

  it('walks searching → assigned → arrived → in progress → completed', () => {
    order();
    store().driverAssigned({ driverId: 4, toPickup: 'abc', etaMinutes: 8 });
    expect(store()).toMatchObject({
      phase: 'driver_assigned',
      driverId: 4,
      polylines: { toPickup: 'abc' },
      etaMinutes: 8,
    });
    store().driverArrived({});
    expect(store().phase).toBe('driver_arrived');
    expect(store().etaMinutes).toBeNull(); // new leg, old ETA dropped
    store().rideStarted({ trip: 'xyz', etaMinutes: 2 });
    expect(store()).toMatchObject({
      phase: 'in_progress',
      polylines: { trip: 'xyz' },
      etaMinutes: 2,
    });
    store().rideFinished(7.5);
    expect(store()).toMatchObject({ phase: 'completed', fare: { final: 7.5 } });
    expect(hasActiveRide()).toBe(false);
  });

  it('ignores late or duplicate events that would go backwards', () => {
    order();
    store().rideStarted({});
    store().driverAssigned({ driverId: 9 }); // late accept after the trip started
    expect(store().phase).toBe('in_progress');
    store().rideFinished(null);
    store().rideCancelled('driver'); // completed is final
    expect(store()).toMatchObject({ phase: 'completed', cancelReason: null });
  });

  it('a same-phase update only refreshes the route info', () => {
    order();
    store().driverAssigned({ driverId: 4, etaMinutes: 8 });
    store().driverAssigned({ etaMinutes: 5 });
    expect(store()).toMatchObject({ phase: 'driver_assigned', driverId: 4, etaMinutes: 5 });
  });

  it('records who cancelled', () => {
    order();
    store().rideCancelled('user');
    expect(store()).toMatchObject({ phase: 'cancelled', cancelReason: 'user' });
  });

  it('no driver lets go of the ride: its late events are ignored, retry searches again', () => {
    order();
    store().noDriverFound();
    expect(store()).toMatchObject({ phase: 'no_driver', rideId: null, driverId: null });
    store().driverAssigned({ driverId: 4 }); // late accept of the cancelled ride
    expect(store().phase).toBe('no_driver');

    expect(store().startSearching({ ...CREATED, rideId: 3 }, DRAFT)).toBe(true);
    expect(store()).toMatchObject({ phase: 'searching', rideId: 3 });
  });

  it('route refreshes do not bump updatedAt (only phase changes do)', () => {
    order();
    store().driverAssigned({ driverId: 4, etaMinutes: 8 });
    const at = store().updatedAt;
    store().driverAssigned({ etaMinutes: 5 });
    store().updateRoute({ etaMinutes: 4 });
    expect(store()).toMatchObject({ etaMinutes: 4, updatedAt: at });
  });

  it('cannot order while a ride is active (and says so, so the caller can cancel it)', () => {
    order();
    expect(store().startSearching({ ...CREATED, rideId: 99 }, DRAFT)).toBe(false);
    expect(store().rideId).toBe(2);
  });

  it('tracks the driver location only while a driver is assigned', () => {
    order();
    store().updateDriverLocation({ latitude: 1, longitude: 2 });
    expect(store().driverLocation).toBeNull();
    store().driverAssigned({ driverId: 4 });
    store().updateDriverLocation({ latitude: 1, longitude: 2 });
    expect(store().driverLocation).toEqual({ latitude: 1, longitude: 2 });
  });

  it('fills in places from the hub only when they are missing', () => {
    order();
    store().driverAssigned({ pickupLocation: { latitude: 9, longitude: 9 } });
    expect(store().pickup?.placeId).toBe('p1');
  });
});

describe('restore and history', () => {
  const SNAPSHOT = {
    rideId: 5,
    phase: 'driver_assigned' as const,
    driverId: 4,
    vehicleType: 2 as const,
    fare: { estimated: 9, original: 9, discount: 0, promoCode: null, final: null },
    tripKm: 4,
    tripMinutes: 10,
    searchStartedAt: 1,
    updatedAt: 2,
  };

  it('restores a snapshot onto an idle store, never over live state', () => {
    store().restore(SNAPSHOT, { pickup: place(1), destination: place(2) });
    expect(store()).toMatchObject({ phase: 'driver_assigned', rideId: 5, driverId: 4 });

    store().reset();
    order();
    store().restore(SNAPSHOT, null);
    expect(store().rideId).toBe(2);
  });

  it('finishes from trip history with the charged fare', () => {
    order();
    const trip: Trip = {
      rideId: 2,
      driver: null,
      vehicle: null,
      pickupAddress: null,
      destinationAddress: null,
      pickupPoint: null,
      destinationPoint: null,
      fare: 10,
      discountAmount: 2,
      finalFare: 8,
      hasDiscount: true,
      date: null,
      status: 'completed',
    };
    store().finishFromHistory('completed', trip);
    expect(store()).toMatchObject({
      phase: 'completed',
      fare: { final: 8, original: 10, discount: 2, promoCode: 'WELCOME' },
    });
  });
});
