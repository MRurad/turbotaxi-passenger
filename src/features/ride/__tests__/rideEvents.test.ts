import {
  flushPendingRideUpdates,
  handleDriverLocation,
  handleRideUpdate,
  resetPendingRideUpdates,
} from '@/features/ride/rideEvents';
import { useRideStore } from '@/features/ride/store';
import type { CreatedRide } from '@/features/ride/types';
import { phaseFromUpdate } from '@/features/ride/utils';
import { rideStatusUpdatedSchema, type RideStatusUpdatedEvent } from '@/realtime/events';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

const RIDE_ID = 2;

/** Parsed like the hub does it, from the positional argument list. */
const update = (payload: Record<string, unknown>, rideId = RIDE_ID): RideStatusUpdatedEvent =>
  rideStatusUpdatedSchema.parse([rideId, 'ride_update', { rideId, ...payload }]);

const CREATED: CreatedRide = {
  rideId: RIDE_ID,
  status: 'searching',
  rawStatus: 'Searching',
  estimatedFare: 5,
  originalEstimatedFare: 5,
  discountAmount: 0,
  promo: null,
  distanceKm: 4,
  durationMinutes: 9,
};
const place = (n: number) => ({
  placeId: null,
  title: `P${n}`,
  subtitle: '',
  location: { latitude: n, longitude: n },
});

const store = () => useRideStore.getState();
const order = () =>
  store().startSearching(CREATED, { pickup: place(1), destination: place(2), vehicleType: 0 });
const accept = () =>
  handleRideUpdate(update({ status: 'Accepted', driverId: 4, polylinePhase: 'Approach' }));

beforeEach(() => {
  store().reset();
  store().markHydrated(true);
  order();
});

describe('phaseFromUpdate with captured statuses', () => {
  it.each([
    ['Searching', 'searching'],
    ['Pending', 'searching'],
    ['OnWay', 'in_progress'],
    ['Completed', 'completed'],
    ['Cancelled', 'cancelled'],
    ['Canceled', 'cancelled'],
    ['CancelledByUser', 'cancelled'],
    ['CanceledByDriver', 'cancelled'],
    ['NoDriverFound', 'no_driver'],
  ])('maps %s to %s', (status, phase) => {
    expect(phaseFromUpdate(update({ status }))).toBe(phase);
  });

  it('lets a known final status win over a stale polylinePhase', () => {
    expect(phaseFromUpdate(update({ status: 'Completed', polylinePhase: 'EnRoute' }))).toBe(
      'completed',
    );
    expect(phaseFromUpdate(update({ status: 'Cancelled', polylinePhase: 'Approach' }))).toBe(
      'cancelled',
    );
  });

  it('reads an EnRoute polylinePhase on an unknown status as the trip', () => {
    expect(phaseFromUpdate(update({ status: 'Whatever', polylinePhase: 'EnRoute' }))).toBe(
      'in_progress',
    );
  });

  it('leaves the phase alone for an in-between cancel state', () => {
    expect(phaseFromUpdate(update({ status: 'CancelRequested' }))).toBeNull();
  });
});

describe('handleRideUpdate', () => {
  it('an unknown status keeps the phase but takes the route info', () => {
    accept();

    handleRideUpdate(update({ status: 'SomethingNew', durationMinutes: 3, distanceKm: 1.2 }));

    expect(store()).toMatchObject({ phase: 'driver_assigned', etaMinutes: 3, remainingKm: 1.2 });
  });

  it('an in-between cancel state does not end the ride', () => {
    accept();

    handleRideUpdate(update({ status: 'CancelRequested' }));

    expect(store().phase).toBe('driver_assigned');
  });

  it('Arrived moves the ride to driver_arrived', () => {
    accept();

    handleRideUpdate(update({ status: 'Arrived', driverId: 4 }));

    expect(store().phase).toBe('driver_arrived');
  });

  it('NoDriverFound ends the search and lets go of the ride id', () => {
    handleRideUpdate(update({ status: 'NoDriverFound' }));

    expect(store()).toMatchObject({ phase: 'no_driver', rideId: null });
  });

  it.each([
    ['CancelledByUser', 'user'],
    ['CancelledByDriver', 'driver'],
    ['Cancelled', 'unknown'],
  ])('%s cancels the ride with reason %s', (status, reason) => {
    accept();

    handleRideUpdate(update({ status }));

    expect(store()).toMatchObject({ phase: 'cancelled', cancelReason: reason });
  });

  it('Completed without a final price leaves the final fare empty', () => {
    accept();

    handleRideUpdate(update({ status: 'Completed' }));

    expect(store()).toMatchObject({ phase: 'completed', fare: { final: null } });
  });

  it('a Searching update while searching never takes the offered driver', () => {
    handleRideUpdate(update({ status: 'Searching', driverId: 7, durationMinutes: 5 }));

    expect(store()).toMatchObject({ phase: 'searching', driverId: null, driverDropped: false });
  });

  it('a Searching update after the driver arrived means the driver dropped out', () => {
    accept();
    handleRideUpdate(update({ status: 'Arrived', driverId: 4 }));

    handleRideUpdate(update({ status: 'Pending' }));

    expect(store()).toMatchObject({ phase: 'searching', driverId: null, driverDropped: true });
  });

  it('a late Searching update during the trip does not restart the search', () => {
    accept();
    handleRideUpdate(update({ status: 'OnWay', polylinePhase: 'EnRoute' }));

    handleRideUpdate(update({ status: 'Searching' }));

    expect(store()).toMatchObject({ phase: 'in_progress', driverId: 4 });
  });

  it('an out-of-order accept after the trip started is ignored', () => {
    handleRideUpdate(update({ status: 'OnWay', polylinePhase: 'EnRoute', driverId: 4 }));

    accept();

    expect(store().phase).toBe('in_progress');
  });

  it('ignores every event when there is no ride', () => {
    store().reset();

    handleRideUpdate(update({ status: 'Accepted', driverId: 4, polylinePhase: 'Approach' }));

    expect(store()).toMatchObject({ phase: 'idle', driverId: null });
  });

  it('ignores the cancel the app sends for a ride it gave up on (no_driver)', () => {
    store().noDriverFound();

    handleRideUpdate(update({ status: 'Cancelled' }));

    expect(store().phase).toBe('no_driver');
  });
});

describe('handleDriverLocation', () => {
  it('is ignored before a driver is assigned', () => {
    handleDriverLocation({ driverId: 4, latitude: 1, longitude: 1 });

    expect(store().driverLocation).toBeNull();
  });
});

describe('updates held until hydration', () => {
  beforeEach(() => {
    resetPendingRideUpdates();
  });

  it('marks the store not hydrated on reset', () => {
    expect(store().hydrated).toBe(false);
  });

  it('replays held updates in arrival order', () => {
    accept();
    handleRideUpdate(update({ status: 'Arrived', driverId: 4 }));
    handleRideUpdate(update({ status: 'OnWay', polylinePhase: 'EnRoute' }));
    expect(store().phase).toBe('searching');

    flushPendingRideUpdates();

    expect(store().phase).toBe('in_progress');
  });

  it('replays an out-of-order pair as it arrived (the late accept is then ignored)', () => {
    handleRideUpdate(update({ status: 'OnWay', polylinePhase: 'EnRoute', driverId: 4 }));
    accept();

    flushPendingRideUpdates();

    expect(store().phase).toBe('in_progress');
  });

  it('ignores held updates for another ride on replay', () => {
    handleRideUpdate(update({ status: 'Completed', finalPrice: 9 }, 77));

    flushPendingRideUpdates();

    expect(store().phase).toBe('searching');
  });

  it('keeps only the newest 20 held updates', () => {
    accept(); // will be dropped: 20 newer updates follow
    for (let i = 0; i < 20; i += 1) {
      handleRideUpdate(update({ status: 'Searching', durationMinutes: i }));
    }

    flushPendingRideUpdates();

    expect(store()).toMatchObject({ phase: 'searching', driverId: null, etaMinutes: 19 });
  });

  it('a reset (logout) drops the held updates', () => {
    accept();

    resetPendingRideUpdates();
    flushPendingRideUpdates();

    expect(store().phase).toBe('searching');
  });

  it('a flush replays each held update once', () => {
    accept();
    flushPendingRideUpdates();
    store().rideCancelled('user');
    store().reset();
    order();

    flushPendingRideUpdates();

    expect(store().phase).toBe('searching');
  });

  it('applies updates directly once hydrated', () => {
    flushPendingRideUpdates();

    accept();

    expect(store().phase).toBe('driver_assigned');
  });
});
