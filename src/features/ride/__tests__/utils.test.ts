import { ROUTES } from '@/constants/routes';
import {
  flushPendingRideUpdates,
  handleDriverLocation,
  handleRideUpdate,
  resetPendingRideUpdates,
} from '@/features/ride/rideEvents';
import { useRideStore } from '@/features/ride/store';
import {
  cancelReasonFromStatus,
  framePoints,
  phaseFromUpdate,
  rideRedirect,
  routeInfoFromUpdate,
} from '@/features/ride/utils';
import { rideStatusUpdatedSchema, type RideStatusUpdatedEvent } from '@/realtime/events';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

/** Parse like the hub does, from the argument lists captured on /dev/realtime. */
const update = (payload: Record<string, unknown>): RideStatusUpdatedEvent =>
  rideStatusUpdatedSchema.parse([2, 'ride_update', { rideId: 2, ...payload }]);

const SEARCHING = update({ status: 'Searching', driverId: 4, distance: 3.67 });
const APPROACH = update({
  status: 'Accepted',
  driverId: 4,
  driverLat: 40.41,
  driverLng: 49.87,
  pickupLat: 40.3769,
  pickupLng: 49.8671,
  encodedPolyline: 'uosuF{wkoH`lEnb@',
  tripEncodedPolyline: 'sbmuFitjoHHAAIAM',
  polylinePhase: 'Approach',
  distanceKm: 3.68,
  durationMinutes: 8,
});
const ON_WAY = update({
  status: 'OnWay',
  startedAt: '2026-10-21T22:05:50.7009993Z',
  encodedPolyline: 'epsuFowkoHIUvAaA',
  tripEncodedPolyline: 'epsuFowkoHIUvAaA',
  polylinePhase: 'EnRoute',
  durationMinutes: 2,
});
const COMPLETED = update({ status: 'Completed', finalPrice: 5, clearMap: true });

describe('phaseFromUpdate', () => {
  it('maps the captured statuses', () => {
    expect(phaseFromUpdate(SEARCHING)).toBe('searching');
    expect(phaseFromUpdate(ON_WAY)).toBe('in_progress');
    expect(phaseFromUpdate(COMPLETED)).toBe('completed');
  });

  it('uses polylinePhase when the status is unknown or ambiguous', () => {
    expect(phaseFromUpdate(update({ status: 'SomethingNew', polylinePhase: 'Approach' }))).toBe(
      'driver_assigned',
    );
    expect(phaseFromUpdate(update({ status: 'OnWay', polylinePhase: 'Approach' }))).toBe(
      'driver_assigned',
    );
    expect(phaseFromUpdate(update({ status: 'SomethingNew' }))).toBeNull();
  });
});

describe('routeInfoFromUpdate', () => {
  it('splits the approach and trip polylines and reads positions', () => {
    expect(routeInfoFromUpdate(APPROACH)).toMatchObject({
      driverId: 4,
      driverLocation: { latitude: 40.41, longitude: 49.87 },
      pickupLocation: { latitude: 40.3769, longitude: 49.8671 },
      toPickup: 'uosuF{wkoH`lEnb@',
      trip: 'sbmuFitjoHHAAIAM',
      etaMinutes: 8,
      remainingKm: 3.68,
    });
    expect(routeInfoFromUpdate(ON_WAY)).toMatchObject({ trip: 'epsuFowkoHIUvAaA', etaMinutes: 2 });
    expect(routeInfoFromUpdate(ON_WAY).toPickup).toBeUndefined();
  });

  it('never takes the driver a Searching update only offered the ride to', () => {
    expect(routeInfoFromUpdate(SEARCHING).driverId).toBeUndefined();
  });

  it('reads driver details only when the backend sends them', () => {
    expect(routeInfoFromUpdate(APPROACH).driver).toBeUndefined();
    expect(
      routeInfoFromUpdate(
        update({ status: 'Accepted', driverName: 'Elvin', vehiclePlateNumber: '10-AA-123' }),
      ).driver,
    ).toMatchObject({ name: 'Elvin', plateNumber: '10-AA-123', phoneNumber: null });
  });
});

describe('cancelReasonFromStatus', () => {
  it('reads who cancelled from the status string', () => {
    expect(cancelReasonFromStatus('CancelledByDriver')).toBe('driver');
    expect(cancelReasonFromStatus('cancelled_by_user')).toBe('user');
    expect(cancelReasonFromStatus('Cancelled')).toBe('unknown');
  });
});

describe('framePoints', () => {
  const car = { latitude: 1, longitude: 1 };
  const pickup = { latitude: 2, longitude: 2 };
  const destination = { latitude: 3, longitude: 3 };
  it('frames what matters in each phase', () => {
    expect(framePoints('driver_assigned', { car, pickup, destination })).toEqual([car, pickup]);
    expect(framePoints('in_progress', { car, pickup, destination })).toEqual([car, destination]);
    expect(framePoints('searching', { car: null, pickup, destination })).toEqual([pickup]);
    expect(framePoints('driver_assigned', { car: null, pickup, destination })).toEqual([pickup]);
  });
});

describe('rideRedirect', () => {
  it('sends active, cancelled and no-driver phases to /ride', () => {
    expect(rideRedirect('searching', ['(app)'])).toBe(ROUTES.ride);
    expect(rideRedirect('cancelled', ['(app)', 'search'])).toBe(ROUTES.ride);
    expect(rideRedirect('in_progress', ['(app)', 'ride'])).toBeNull();
  });

  it('sends completed to the summary and idle home', () => {
    expect(rideRedirect('completed', ['(app)', 'ride'])).toBe(ROUTES.rideSummary);
    expect(rideRedirect('completed', ['(app)', 'ride', 'summary'])).toBeNull();
    expect(rideRedirect('idle', ['(app)', 'ride', 'summary'])).toBe(ROUTES.home);
    expect(rideRedirect('idle', ['(app)'])).toBeNull();
  });

  it('lets the chat stay open during a ride, but not after it', () => {
    expect(rideRedirect('driver_assigned', ['(app)', 'chat', '[rideId]'])).toBeNull();
    expect(rideRedirect('completed', ['(app)', 'chat', '[rideId]'])).toBe(ROUTES.rideSummary);
    expect(rideRedirect('cancelled', ['(app)', 'chat', '[rideId]'])).toBe(ROUTES.ride);
    // Searching again (driver dropped out): no driver to chat with.
    expect(rideRedirect('searching', ['(app)', 'chat', '[rideId]'])).toBe(ROUTES.ride);
    // A stale chat link with no ride goes home.
    expect(rideRedirect('idle', ['(app)', 'chat', '[rideId]'])).toBe(ROUTES.home);
  });

  it('never hijacks screens outside the signed-in group (dev inspector)', () => {
    expect(rideRedirect('searching', ['dev', 'realtime'])).toBeNull();
  });
});

describe('handleRideUpdate / handleDriverLocation', () => {
  const store = () => useRideStore.getState();
  beforeEach(() => {
    store().reset();
    store().markHydrated(true);
    store().startSearching(
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
      {
        pickup: {
          placeId: null,
          title: 'A',
          subtitle: '',
          location: { latitude: 1, longitude: 1 },
        },
        destination: {
          placeId: null,
          title: 'B',
          subtitle: '',
          location: { latitude: 2, longitude: 2 },
        },
        vehicleType: 0,
      },
    );
  });

  it('drives the store through the captured sequence', () => {
    handleRideUpdate(SEARCHING);
    expect(store()).toMatchObject({ phase: 'searching', driverId: null });
    handleRideUpdate(APPROACH);
    expect(store()).toMatchObject({ phase: 'driver_assigned', driverId: 4, etaMinutes: 8 });
    handleDriverLocation({ driverId: 4, latitude: 40.4097, longitude: 49.8727 });
    expect(store().driverLocation).toEqual({ latitude: 40.4097, longitude: 49.8727 });
    handleRideUpdate(ON_WAY);
    expect(store().phase).toBe('in_progress');
    handleRideUpdate(COMPLETED);
    expect(store()).toMatchObject({ phase: 'completed', fare: { final: 5 } });
  });

  it('ignores other rides and other drivers', () => {
    handleRideUpdate(rideStatusUpdatedSchema.parse([9, 'ride_update', { status: 'Completed' }]));
    expect(store().phase).toBe('searching');
    handleRideUpdate(APPROACH);
    handleDriverLocation({ driverId: 7, latitude: 0, longitude: 0 });
    expect(store().driverLocation).toEqual({ latitude: 40.41, longitude: 49.87 });
  });
});

describe('updates before hydration', () => {
  it('are held until recovery has run, then replayed in order', () => {
    const store = useRideStore.getState;
    store().reset();
    resetPendingRideUpdates(); // not hydrated: a fresh app start
    store().startSearching(
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
      {
        pickup: {
          placeId: null,
          title: 'A',
          subtitle: '',
          location: { latitude: 1, longitude: 1 },
        },
        destination: {
          placeId: null,
          title: 'B',
          subtitle: '',
          location: { latitude: 2, longitude: 2 },
        },
        vehicleType: 0,
      },
    );
    handleRideUpdate(APPROACH);
    expect(store().phase).toBe('searching');
    flushPendingRideUpdates();
    expect(store()).toMatchObject({ phase: 'driver_assigned', driverId: 4, hydrated: true });
  });
});

describe('driver changes', () => {
  const store = () => useRideStore.getState();
  beforeEach(() => {
    store().reset();
    store().markHydrated(true);
    store().startSearching(
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
      {
        pickup: {
          placeId: null,
          title: 'A',
          subtitle: '',
          location: { latitude: 1, longitude: 1 },
        },
        destination: {
          placeId: null,
          title: 'B',
          subtitle: '',
          location: { latitude: 2, longitude: 2 },
        },
        vehicleType: 0,
      },
    );
  });

  it('a Searching update after an accept means the driver dropped out: search again', () => {
    handleRideUpdate(APPROACH);
    handleDriverLocation({ driverId: 4, latitude: 40.4, longitude: 49.8 });
    const firstSearch = store().searchStartedAt;
    handleRideUpdate(SEARCHING);
    expect(store()).toMatchObject({
      phase: 'searching',
      driverId: null,
      driver: null,
      driverLocation: null,
      polylines: { toPickup: null },
    });
    expect(store().searchStartedAt).toBeGreaterThanOrEqual(firstSearch ?? 0);
  });

  it('a driver cancel in another spelling ends the ride, naming the driver', () => {
    handleRideUpdate(APPROACH);
    handleRideUpdate(update({ status: 'CanceledByDriver' }));
    expect(store()).toMatchObject({ phase: 'cancelled', cancelReason: 'driver' });
  });

  it("a new driver doesn't inherit the previous driver's details", () => {
    store().driverAssigned({
      driverId: 4,
      driver: {
        name: 'Old',
        phoneNumber: null,
        plateNumber: null,
        brand: null,
        model: null,
        color: null,
      },
    });
    store().driverAssigned({ driverId: 9 });
    expect(store()).toMatchObject({ driverId: 9, driver: null });
  });
});
