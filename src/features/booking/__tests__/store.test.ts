import { VEHICLE_TYPE } from '@/constants/vehicles';
import { useBookingDraft } from '@/features/booking/store';
import type { UserPromo } from '@/features/promo/types';

// Pin-pick flows are covered in src/features/home/__tests__/stores.test.ts; these are the
// remaining draft actions.

const place = (n: number) => ({
  placeId: `p${n}`,
  title: `Place ${n}`,
  subtitle: '',
  location: { latitude: 40 + n / 100, longitude: 49.8 },
});
const PROMO: UserPromo = {
  id: 1,
  promoCodeId: 1,
  code: 'WELCOME',
  description: null,
  discount: { kind: 'percentage', value: 20, maxAmount: 5 },
  startDate: null,
  endDate: null,
  remainingRides: 2,
  usedCount: 0,
  isActive: true,
  canUse: true,
};

const draft = () => useBookingDraft.getState();

beforeEach(() => draft().reset());

describe('booking draft', () => {
  it('starts empty, unlocked, on Economy with nothing chosen', () => {
    expect(draft()).toMatchObject({
      pickup: null,
      destination: null,
      mapPick: null,
      pickupLocked: false,
      vehicleType: VEHICLE_TYPE.Economy,
      vehicleChosen: false,
      promo: null,
    });
  });

  it('setting a destination locks the pickup and closes "choose on map"', () => {
    draft().startPinPicking('destination');

    draft().setDestination(place(2));

    expect(draft()).toMatchObject({
      destination: { placeId: 'p2' },
      mapPick: null,
      pickupLocked: true,
    });
  });

  it('clearing the destination returns to free mode, where the pickup can be unlocked', () => {
    draft().setPickupFromPin(place(1));
    draft().setDestination(place(2));

    draft().clearDestination();
    draft().unlockPickup();
    draft().setPickupFromPin(place(3));

    expect(draft()).toMatchObject({ destination: null, pickup: { placeId: 'p3' } });
  });

  it('clearing the destination also leaves "choose on map"', () => {
    draft().setDestination(place(2));
    draft().startPinPicking('pickup');

    draft().clearDestination();

    expect(draft().mapPick).toBeNull();
  });

  it('a searched pickup ends "choose on map" for the pickup', () => {
    draft().setDestination(place(2));
    draft().startPinPicking('pickup');

    draft().setPickup(place(4));

    expect(draft()).toMatchObject({ mapPick: null, pickupLocked: true, pickup: { placeId: 'p4' } });
  });

  it('selecting a vehicle marks it as an explicit choice', () => {
    draft().selectVehicle(VEHICLE_TYPE.Comfort);

    expect(draft()).toMatchObject({ vehicleType: VEHICLE_TYPE.Comfort, vehicleChosen: true });
  });

  it('sets and clears the promo', () => {
    draft().setPromo(PROMO);
    expect(draft().promo?.code).toBe('WELCOME');

    draft().setPromo(null);

    expect(draft().promo).toBeNull();
  });

  it('reset clears everything, including the explicit vehicle choice', () => {
    draft().setPickup(place(1));
    draft().setDestination(place(2));
    draft().selectVehicle(VEHICLE_TYPE.Business);
    draft().setPromo(PROMO);

    draft().reset();

    expect(draft()).toMatchObject({
      pickup: null,
      destination: null,
      pickupLocked: false,
      vehicleType: VEHICLE_TYPE.Economy,
      vehicleChosen: false,
      promo: null,
    });
    draft().autoSelectVehicle(VEHICLE_TYPE.Minivan);
    expect(draft().vehicleType).toBe(VEHICLE_TYPE.Minivan);
  });
});
