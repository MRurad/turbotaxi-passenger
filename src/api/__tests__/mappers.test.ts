import { mapAuthSession, mapUser } from '@/api/mappers/auth';
import { isSameActor, mapChatMessage, mapConversation } from '@/api/mappers/chat';
import { mapPaged } from '@/api/mappers/common';
import { mapPromoApplication, mapUserPromo } from '@/api/mappers/promo';
import { mapCancelledRide, mapCreatedRide, toCreateRideRequest } from '@/api/mappers/rides';
import { mapEstimate, toEstimateRequest } from '@/api/mappers/routes';
import { mapTrip } from '@/api/mappers/tripHistory';
import { VEHICLE_TYPE } from '@/constants/vehicles';

const BAKU = { latitude: 40.4093, longitude: 49.8671 };
const AIRPORT = { latitude: 40.4675, longitude: 50.0467 };

describe('auth mappers', () => {
  it('maps a full auth response and computes expiry from expiresIn', () => {
    const session = mapAuthSession(
      {
        user: {
          id: 7,
          name: ' Rashad ',
          surname: 'Mammadov',
          email: 'r@x.az',
          phoneNumber: '+994',
        },
        tokens: { accessToken: 'abc', refreshToken: 'r1', expiresIn: 3600 },
      },
      1_000,
    );
    expect(session.user).toEqual({
      id: 7,
      name: 'Rashad',
      surname: 'Mammadov',
      email: 'r@x.az',
      phoneNumber: '+994',
      createdAt: null,
    });
    expect(session.tokens).toEqual({
      accessToken: 'abc',
      refreshToken: 'r1',
      expiresAt: 3_601_000,
    });
  });

  it('leaves expiry unknown when expiresIn is missing', () => {
    const session = mapAuthSession({ user: { id: 1 }, tokens: { accessToken: 'a' } });
    expect(session.tokens.expiresAt).toBeNull();
    expect(session.tokens.refreshToken).toBeNull();
  });

  it('rejects a response without a token or user id', () => {
    expect(() => mapAuthSession({ user: { id: 1 }, tokens: {} })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
    expect(() => mapUser({ name: 'x' })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});

describe('route estimate mappers', () => {
  it('builds the request with the store userId and drops blank promo codes', () => {
    const request = toEstimateRequest(
      { origin: BAKU, destination: AIRPORT, vehicleType: VEHICLE_TYPE.Comfort, promoCode: '  ' },
      7,
    );
    expect(request).toEqual({
      origin: BAKU,
      destination: AIRPORT,
      vehicleType: 1,
      promoCode: null,
      userId: 7,
    });
  });

  it('maps a discounted estimate', () => {
    const estimate = mapEstimate({
      distanceKm: 21.4,
      durationMinutes: 25,
      price: { original: 20, discount: 4, final: 16, currency: 'AZN' },
      encodedPolyline: 'abc',
    });
    expect(estimate.price).toEqual({
      original: 20,
      discount: 4,
      final: 16,
      currency: 'AZN',
      hasDiscount: true,
    });
    expect(estimate.encodedPolyline).toBe('abc');
  });

  it('reconstructs the original price and defaults currency/polyline', () => {
    const estimate = mapEstimate({ price: { final: 10, discount: 0 }, encodedPolyline: '' });
    expect(estimate.price).toMatchObject({ original: 10, currency: 'AZN', hasDiscount: false });
    expect(estimate.encodedPolyline).toBeNull();
    expect(estimate.distanceKm).toBe(0);
  });
});

describe('ride mappers', () => {
  it('builds CreateRideRequest', () => {
    expect(toCreateRideRequest({ pickup: BAKU, destination: AIRPORT, vehicleType: 0 }, 7)).toEqual({
      pickupLat: BAKU.latitude,
      pickupLng: BAKU.longitude,
      destinationLat: AIRPORT.latitude,
      destinationLng: AIRPORT.longitude,
      vehicleType: 0,
      userId: 7,
    });
  });

  it('maps a created ride with a promo and normalizes status', () => {
    const ride = mapCreatedRide({
      rideId: 42,
      status: 'Searching',
      estimatedFare: 8,
      originalEstimatedFare: 10,
      discountAmount: 2,
      promoApplied: true,
      promoCode: 'WELCOME',
      promoRemainingRides: 2,
    });
    expect(ride).toMatchObject({
      rideId: 42,
      status: 'searching',
      rawStatus: 'Searching',
      promo: { code: 'WELCOME', remainingRides: 2 },
    });
  });

  it('maps unknown statuses safely and ignores promo fields when not applied', () => {
    const ride = mapCreatedRide({
      rideId: 1,
      status: 'Weird',
      estimatedFare: 7,
      promoApplied: false,
      promoCode: 'X',
    });
    expect(ride.status).toBe('unknown');
    expect(ride.promo).toBeNull();
    expect(ride.originalEstimatedFare).toBe(7);
  });

  it('rejects a created ride without a fare instead of showing 0 ₼', () => {
    expect(() => mapCreatedRide({ rideId: 1 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('treats a cancel response without status as cancelled', () => {
    expect(mapCancelledRide({}, 42)).toEqual({ rideId: 42, status: 'cancelled' });
  });
});

describe('chat mapper', () => {
  const me = { role: 'User', id: 7 };

  it('marks my messages regardless of role casing', () => {
    const mine = mapChatMessage(
      {
        id: 1,
        rideId: 2,
        senderRole: 'user',
        senderId: 7,
        text: 'Hi',
        sentAtUtc: '2026-01-01T10:00:00',
      },
      me,
    );
    const theirs = mapChatMessage(
      { id: 2, rideId: 2, senderRole: 'Driver', senderId: 7, text: 'Yo', sentAtUtc: '2026-01-01' },
      me,
    );
    expect(mine.isMine).toBe(true);
    expect(theirs.isMine).toBe(false);
  });

  it('rejects a message without a timestamp', () => {
    expect(() => mapChatMessage({ id: 1, rideId: 2, text: 'x' }, me)).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});

describe('trip history mapper', () => {
  it('maps driver, vehicle and discount', () => {
    const trip = mapTrip({
      rideId: 5,
      driverName: 'Elvin',
      driverSurname: 'Aliyev',
      vehiclePlateNumber: '10-AB-123',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Prius',
      vehicleType: 'Comfort',
      fare: 12,
      discountAmount: 2,
      finalFare: 10,
      status: 'Completed',
      rideDateUtc: '2026-01-15T12:00:00',
    });
    expect(trip.driver).toEqual({ name: 'Elvin', surname: 'Aliyev', phoneNumber: null });
    expect(trip.vehicle).toMatchObject({ plateNumber: '10-AB-123', type: 'Comfort' });
    expect(trip).toMatchObject({ hasDiscount: true, finalFare: 10, status: 'completed' });
  });

  it('returns null driver/vehicle and derives finalFare when missing', () => {
    const trip = mapTrip({ rideId: 6, fare: 9, discountAmount: null, finalFare: null });
    expect(trip.driver).toBeNull();
    expect(trip.vehicle).toBeNull();
    expect(trip.finalFare).toBe(9);
    expect(trip.hasDiscount).toBe(false);
  });
});

describe('promo mappers', () => {
  const base = { userPromoCodeId: 1, promoCodeId: 10, code: 'SALE', usedCount: 1 };

  it('maps percentage and amount discounts', () => {
    expect(
      mapUserPromo({ ...base, discountType: 0, discountValue: 20, maxDiscountAmount: 5 }).discount,
    ).toEqual({ kind: 'percentage', value: 20, maxAmount: 5 });
    expect(mapUserPromo({ ...base, discountType: 1, discountValue: 3 }).discount).toEqual({
      kind: 'amount',
      value: 3,
    });
  });

  it('requires a code', () => {
    expect(() => mapUserPromo({ ...base, code: '' })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('fills an apply response from the request when fields are missing', () => {
    expect(
      mapPromoApplication({ discountAmount: 2 }, { promoCodeId: 10, originalFare: 12 }),
    ).toEqual({
      promoCodeId: 10,
      originalFare: 12,
      discountAmount: 2,
      finalFare: 10,
    });
  });
});

describe('mapPaged', () => {
  it('normalizes paging and computes hasNextPage', () => {
    const page = mapPaged(
      { items: [1, 2], pageNumber: 1, pageSize: 2, totalCount: 5, totalPages: 3 },
      (n) => n * 10,
    );
    expect(page).toEqual({
      items: [10, 20],
      pageNumber: 1,
      pageSize: 2,
      totalCount: 5,
      totalPages: 3,
      hasNextPage: true,
    });
    expect(mapPaged({ items: null }, (n: number) => n)).toMatchObject({
      items: [],
      hasNextPage: false,
    });
  });
});

describe('strict fields', () => {
  it('rejects an estimate without a final price', () => {
    expect(() => mapEstimate({ distanceKm: 3 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('rejects non-positive user ids (they would fail userSchema on next launch)', () => {
    expect(() => mapUser({ id: 0 })).toThrow(expect.objectContaining({ code: 'invalidResponse' }));
    expect(() => mapUser({ id: -3 })).toThrow(expect.objectContaining({ code: 'invalidResponse' }));
  });

  it('rejects a fractional user id', () => {
    expect(() => mapUser({ id: 1.5 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});

describe('ride mappers (branches)', () => {
  it('drops a promo that was applied but has a blank code', () => {
    const ride = mapCreatedRide({
      rideId: 1,
      estimatedFare: 5,
      promoApplied: true,
      promoCode: ' ',
    });

    expect(ride.promo).toBeNull();
  });

  it('keeps remainingRides null when an applied promo omits it', () => {
    const ride = mapCreatedRide({
      rideId: 1,
      estimatedFare: 5,
      promoApplied: true,
      promoCode: 'X',
    });

    expect(ride.promo).toEqual({ code: 'X', remainingRides: null });
  });

  it('defaults discount to 0, trip numbers and raw status to null when omitted', () => {
    const ride = mapCreatedRide({ rideId: 1, estimatedFare: 5 });

    expect(ride).toMatchObject({
      status: 'unknown',
      rawStatus: null,
      discountAmount: 0,
      distanceKm: null,
      durationMinutes: null,
    });
  });

  it('rejects a created ride without a ride id', () => {
    expect(() => mapCreatedRide({ estimatedFare: 5 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('uses the response ride id and status of a cancel response when present', () => {
    expect(mapCancelledRide({ rideId: 9, status: 'Completed' }, 42)).toEqual({
      rideId: 9,
      status: 'completed',
    });
  });
});

describe('trip history mapper (branches)', () => {
  it('reads coordinates stored in the address fields as points', () => {
    const trip = mapTrip({
      rideId: 1,
      pickupAddress: '40.4093, 49.8671',
      destinationAddress: '(40.4675;50.0467)',
    });

    expect(trip).toMatchObject({
      pickupAddress: null,
      pickupPoint: BAKU,
      destinationAddress: null,
      destinationPoint: AIRPORT,
    });
  });

  it('keeps a real address as text without a point', () => {
    const trip = mapTrip({ rideId: 1, pickupAddress: ' 28 May St ', destinationAddress: '  ' });

    expect(trip).toMatchObject({
      pickupAddress: '28 May St',
      pickupPoint: null,
      destinationAddress: null,
      destinationPoint: null,
    });
  });

  it('builds a driver from a surname alone', () => {
    const trip = mapTrip({ rideId: 1, driverSurname: 'Aliyev', driverPhoneNumber: ' +994 ' });

    expect(trip.driver).toEqual({ name: '', surname: 'Aliyev', phoneNumber: '+994' });
  });

  it('builds a driver from a name alone', () => {
    const trip = mapTrip({ rideId: 1, driverName: 'Elvin' });

    expect(trip.driver).toEqual({ name: 'Elvin', surname: '', phoneNumber: null });
  });

  it('builds a vehicle from any one of plate, brand or model', () => {
    const trip = mapTrip({ rideId: 1, vehicleModel: 'Prius', vehicleType: ' ' });

    expect(trip.vehicle).toEqual({ plateNumber: null, type: null, brand: null, model: 'Prius' });
  });

  it('ignores a vehicle type alone (no plate, brand or model)', () => {
    expect(mapTrip({ rideId: 1, vehicleType: 'Comfort' }).vehicle).toBeNull();
  });

  it('derives finalFare from fare minus discount and flags the discount', () => {
    const trip = mapTrip({ rideId: 1, fare: 12, discountAmount: 2 });

    expect(trip).toMatchObject({ finalFare: 10, hasDiscount: true });
  });

  it('defaults a trip without fare, date or status to zero / null / unknown', () => {
    const trip = mapTrip({ rideId: 1 });

    expect(trip).toMatchObject({ fare: 0, finalFare: 0, date: null, status: 'unknown' });
  });

  it('rejects a trip without a ride id', () => {
    expect(() => mapTrip({ fare: 1 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});

describe('chat mappers (branches)', () => {
  const me = { role: 'user', id: 7 };

  it('defaults a missing sender and text', () => {
    const message = mapChatMessage({ id: 1, rideId: 2, sentAtUtc: '2026-01-01T10:00:00' }, me);

    expect(message).toMatchObject({ senderRole: '', senderId: 0, text: '', isMine: false });
  });

  it('does not mark a message from another user id as mine', () => {
    const message = mapChatMessage(
      { id: 1, rideId: 2, senderRole: 'user', senderId: 8, sentAtUtc: '2026-01-01' },
      me,
    );

    expect(message.isMine).toBe(false);
  });

  it('rejects a message without a ride id', () => {
    expect(() => mapChatMessage({ id: 1, sentAtUtc: '2026-01-01' }, me)).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('isSameActor treats a missing role as not me', () => {
    expect(isSameActor(null, 7, me)).toBe(false);
    expect(isSameActor('USER', 7, me)).toBe(true);
  });

  it('maps a sparse conversation with empty defaults', () => {
    expect(mapConversation({ rideId: 3, lastMessagePreview: '  ' })).toEqual({
      rideId: 3,
      counterpartyRole: '',
      counterpartyId: 0,
      counterpartyName: '',
      lastMessagePreview: null,
      lastMessageAt: null,
      lastMessageSenderRole: null,
    });
  });

  it('rejects a conversation without a ride id', () => {
    expect(() => mapConversation({ counterpartyId: 1 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });
});

describe('promo mappers (branches)', () => {
  const base = { userPromoCodeId: 1, promoCodeId: 10, code: 'SALE' };

  it('defaults optional promo fields', () => {
    expect(mapUserPromo(base)).toEqual({
      id: 1,
      promoCodeId: 10,
      code: 'SALE',
      description: null,
      discount: { kind: 'percentage', value: 0, maxAmount: null },
      startDate: null,
      endDate: null,
      remainingRides: null,
      usedCount: 0,
      isActive: false,
      canUse: false,
    });
  });

  it('keeps dates, description and remaining rides when present', () => {
    const promo = mapUserPromo({
      ...base,
      description: ' Spring sale ',
      startDate: '2026-03-01T00:00:00',
      endDate: '2026-04-01T00:00:00',
      remainingRideCount: 2,
      isActive: true,
      canUse: true,
    });

    expect(promo).toMatchObject({
      description: 'Spring sale',
      startDate: '2026-03-01T00:00:00',
      endDate: '2026-04-01T00:00:00',
      remainingRides: 2,
      isActive: true,
      canUse: true,
    });
  });

  it('rejects a promo without ids', () => {
    expect(() => mapUserPromo({ code: 'X', promoCodeId: 10 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
    expect(() => mapUserPromo({ code: 'X', userPromoCodeId: 1 })).toThrow(
      expect.objectContaining({ code: 'invalidResponse' }),
    );
  });

  it('prefers the response values of an apply response', () => {
    expect(
      mapPromoApplication(
        { promoCodeId: 11, originalFare: 20, discountAmount: 5, finalFare: 15 },
        { promoCodeId: 10, originalFare: 12 },
      ),
    ).toEqual({ promoCodeId: 11, originalFare: 20, discountAmount: 5, finalFare: 15 });
  });

  it('treats an empty apply response as no discount', () => {
    expect(mapPromoApplication({}, { promoCodeId: 10, originalFare: 12 })).toEqual({
      promoCodeId: 10,
      originalFare: 12,
      discountAmount: 0,
      finalFare: 12,
    });
  });
});

describe('route estimate mappers (branches)', () => {
  it('keeps a provided promo code trimmed', () => {
    const request = toEstimateRequest(
      { origin: BAKU, destination: AIRPORT, vehicleType: VEHICLE_TYPE.Economy, promoCode: ' X ' },
      7,
    );

    expect(request.promoCode).toBe('X');
  });

  it('sends a null promo code when none is given', () => {
    const request = toEstimateRequest(
      { origin: BAKU, destination: AIRPORT, vehicleType: VEHICLE_TYPE.Economy },
      7,
    );

    expect(request.promoCode).toBeNull();
  });

  it('does not flag a discount when the original price is not above the final', () => {
    const estimate = mapEstimate({ price: { original: 10, discount: 2, final: 10 } });

    expect(estimate.price.hasDiscount).toBe(false);
  });
});
