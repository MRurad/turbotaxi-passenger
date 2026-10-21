import { create } from 'zustand';

import type { Place } from '@/types/place';

/** Which point the center pin is currently choosing on the home map. */
export type PinTarget = 'pickup' | 'destination';

interface BookingDraftState {
  pickup: Place | null;
  destination: Place | null;
  /** 'destination' while the user chose "Choose on map" for the destination. */
  pinTarget: PinTarget;
  /**
   * When true the center pin no longer moves the pickup. Set by an explicit pickup (search),
   * while choosing the destination on the map, and once a destination exists (the map then
   * frames both points). Cleared only when the user drags the map in pickup mode.
   */
  pickupLocked: boolean;
}

interface BookingDraftActions {
  /** From the center pin (map drag) — ignored while the pickup is locked. */
  setPickupFromPin: (place: Place) => void;
  /** From search: an explicit pickup choice. */
  setPickup: (place: Place) => void;
  setDestination: (place: Place) => void;
  clearDestination: () => void;
  /** "Pickup follows the map" again (user dragged the map in pickup mode). */
  unlockPickup: () => void;
  /** Start choosing `target` with the center pin. Choosing the destination freezes the pickup. */
  startPinPicking: (target: PinTarget) => void;
  /** Leave destination-on-map mode without picking (pickup stays where it was). */
  cancelPinPicking: () => void;
  reset: () => void;
}

export type BookingDraftStore = BookingDraftState & BookingDraftActions;

const INITIAL: BookingDraftState = {
  pickup: null,
  destination: null,
  pinTarget: 'pickup',
  pickupLocked: false,
};

/** Pickup/destination being booked. In-memory: a fresh launch starts from the user's location. */
export const useBookingDraft = create<BookingDraftStore>()((set, get) => ({
  ...INITIAL,
  setPickupFromPin: (place) => {
    const { pickupLocked, pinTarget } = get();
    if (!pickupLocked && pinTarget === 'pickup') set({ pickup: place });
  },
  setPickup: (place) => set({ pickup: place, pickupLocked: true }),
  setDestination: (place) => set({ destination: place, pinTarget: 'pickup', pickupLocked: true }),
  clearDestination: () => set({ destination: null }),
  unlockPickup: () => {
    if (get().pinTarget === 'pickup') set({ pickupLocked: false });
  },
  startPinPicking: (target) =>
    set(
      target === 'destination' ? { pinTarget: target, pickupLocked: true } : { pinTarget: target },
    ),
  cancelPinPicking: () => set({ pinTarget: 'pickup' }),
  reset: () => set(INITIAL),
}));
