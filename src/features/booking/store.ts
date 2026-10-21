import { create } from 'zustand';

import { VEHICLE_TYPE, type VehicleType } from '@/constants/vehicles';
import type { UserPromo } from '@/features/promo/types';
import type { Place } from '@/types/place';

/** Which point the center pin is explicitly choosing ("Choose on map"), with a confirm step. */
export type PinTarget = 'pickup' | 'destination';

interface BookingDraftState {
  pickup: Place | null;
  destination: Place | null;
  /**
   * Set while "Choose on map" is open for that point (pin + confirm button). Null otherwise:
   * without a destination the pin then IS the pickup (unless locked); with one, the map frames
   * the route and the pin is hidden.
   */
  mapPick: PinTarget | null;
  /**
   * When true the center pin no longer moves the pickup. Set by an explicit pickup (search or
   * a confirmed pin), and always while a destination exists or a point is being picked.
   * Cleared only in free mode (no destination, nothing picked) when the user moves the map.
   */
  pickupLocked: boolean;
  vehicleType: VehicleType;
  /** True once the user tapped a class; until then the app may switch to one that has a price. */
  vehicleChosen: boolean;
  /** Promo applied to the estimates (and later to the ride). */
  promo: UserPromo | null;
}

interface BookingDraftActions {
  /** From the center pin in free mode — ignored while the pickup is locked. */
  setPickupFromPin: (place: Place) => void;
  /** From search: an explicit pickup choice. */
  setPickup: (place: Place) => void;
  setDestination: (place: Place) => void;
  clearDestination: () => void;
  /** "Pickup follows the map" again — only in free mode (no destination, nothing picked). */
  unlockPickup: () => void;
  /**
   * "Choose on map" for `target`. For the pickup without a destination this is just free mode
   * (the pin is the pickup); otherwise a pick with a confirm step, leaving the draft untouched
   * until confirmed.
   */
  startPinPicking: (target: PinTarget) => void;
  /** Leave "Choose on map" without picking (both points stay where they were). */
  cancelPinPicking: () => void;
  /** Explicit user choice. */
  selectVehicle: (vehicleType: VehicleType) => void;
  /** App fallback (e.g. the default class has no price); ignored after an explicit choice. */
  autoSelectVehicle: (vehicleType: VehicleType) => void;
  setPromo: (promo: UserPromo | null) => void;
  reset: () => void;
}

export type BookingDraftStore = BookingDraftState & BookingDraftActions;

const INITIAL: BookingDraftState = {
  pickup: null,
  destination: null,
  mapPick: null,
  pickupLocked: false,
  vehicleType: VEHICLE_TYPE.Economy,
  vehicleChosen: false,
  promo: null,
};

/** No destination and no "Choose on map": the only mode where the pin may move the pickup. */
const isFreeMode = (s: BookingDraftState) => s.destination === null && s.mapPick === null;

/**
 * What's being booked: pickup, destination, vehicle and promo. In-memory (a fresh launch starts
 * from the user's location); reset after a ride is created and on logout.
 */
export const useBookingDraft = create<BookingDraftStore>()((set, get) => ({
  ...INITIAL,
  setPickupFromPin: (place) => {
    if (isFreeMode(get()) && !get().pickupLocked) set({ pickup: place });
  },
  setPickup: (place) => set({ pickup: place, pickupLocked: true, mapPick: null }),
  setDestination: (place) => set({ destination: place, mapPick: null, pickupLocked: true }),
  clearDestination: () => set({ destination: null, mapPick: null }),
  unlockPickup: () => {
    if (isFreeMode(get())) set({ pickupLocked: false });
  },
  startPinPicking: (target) => {
    if (target === 'pickup' && get().destination === null) {
      set({ mapPick: null, pickupLocked: false });
      return;
    }
    set({ mapPick: target, pickupLocked: true });
  },
  cancelPinPicking: () => set({ mapPick: null }),
  selectVehicle: (vehicleType) => set({ vehicleType, vehicleChosen: true }),
  autoSelectVehicle: (vehicleType) => {
    if (!get().vehicleChosen) set({ vehicleType });
  },
  setPromo: (promo) => set({ promo }),
  reset: () => set(INITIAL),
}));
