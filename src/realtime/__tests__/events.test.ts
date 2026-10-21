import {
  chatMessageSchema,
  driverLocationSchema,
  rideStatusUpdatedSchema,
} from '@/realtime/events';

// Argument lists as captured on /dev/realtime (2026-10-22), trimmed.
const SEARCHING = [
  2,
  'ride_update',
  {
    rideId: 2,
    status: 'Searching',
    message: 'Driver #4 is 3.7km away',
    driverId: 4,
    distance: 3.67,
  },
];
const ON_WAY = [
  2,
  'ride_update',
  {
    rideId: 2,
    status: 'OnWay',
    startedAt: '2026-10-21T22:05:50.7009993Z',
    driverLat: 40.40972453012213,
    driverLng: 49.87276852505369,
    pickupLat: 40.3769,
    pickupLng: 49.8671,
    destinationLat: 40.4093,
    destinationLng: 49.8671,
    encodedPolyline: 'epsuFowkoHIUvAaAPILIbBmA|',
    tripEncodedPolyline: 'epsuFowkoHIUvAaAPILIbBmA|',
    polylinePhase: 'EnRoute',
    distanceKm: 1.14,
    durationMinutes: 2,
    message: 'Trip started! ETA: 2 min',
  },
];
const COMPLETED = [
  2,
  'ride_update',
  {
    rideId: 2,
    status: 'Completed',
    finalPrice: 5,
    completedAtUtc: '2026-10-21T22:06:46.2067803Z',
    clearMap: true,
    userType: 'user',
    encodedPolyline: null,
    tripEncodedPolyline: null,
    polylinePhase: null,
    distanceKm: null,
    durationMinutes: null,
  },
];

describe('rideStatusUpdatedSchema', () => {
  it('parses the captured argument lists into one object', () => {
    expect(rideStatusUpdatedSchema.parse(SEARCHING)).toMatchObject({
      rideId: 2,
      type: 'ride_update',
      status: 'Searching',
      driverId: 4,
    });
    expect(rideStatusUpdatedSchema.parse(ON_WAY)).toMatchObject({
      status: 'OnWay',
      polylinePhase: 'EnRoute',
      driverLat: 40.40972453012213,
    });
    expect(rideStatusUpdatedSchema.parse(COMPLETED)).toMatchObject({
      status: 'Completed',
      finalPrice: 5,
      clearMap: true,
      userType: 'user', // unknown extra fields are kept
    });
  });

  it('uses the routed rideId and rejects a payload naming another ride', () => {
    expect(rideStatusUpdatedSchema.parse([7, 'ride_update', { status: 'Searching' }]).rideId).toBe(
      7,
    );
    expect(
      rideStatusUpdatedSchema.safeParse([7, 'ride_update', { rideId: 8, status: 'Searching' }])
        .success,
    ).toBe(false);
  });

  it('rejects a payload without a status', () => {
    expect(rideStatusUpdatedSchema.safeParse([2, 'ride_update', { rideId: 2 }]).success).toBe(
      false,
    );
  });
});

describe('driverLocationSchema', () => {
  it('maps (driverId, lat, lng) to an object', () => {
    expect(driverLocationSchema.parse([4, 40.40972602688598, 49.872767534143726])).toEqual({
      driverId: 4,
      latitude: 40.40972602688598,
      longitude: 49.872767534143726,
    });
    expect(driverLocationSchema.safeParse([{ driverId: 4 }]).success).toBe(false);
  });

  it('accepts extra trailing arguments', () => {
    expect(driverLocationSchema.parse([4, 1, 2, 'extra'])).toEqual({
      driverId: 4,
      latitude: 1,
      longitude: 2,
    });
  });
});

describe('chatMessageSchema', () => {
  it('unwraps the single message argument', () => {
    const message = { id: 1, rideId: 2, text: 'Salam' };
    expect(chatMessageSchema.parse([message])).toMatchObject(message);
    expect(chatMessageSchema.safeParse([]).success).toBe(false);
  });
});
