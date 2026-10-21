import { create } from 'zustand';

import { VEHICLE_TYPE, type VehicleType } from '@/constants/vehicles';
import type { Trip } from '@/features/history/types';
import { logger } from '@/lib/logger';
import type { LatLng } from '@/types/geo';
import type { Place } from '@/types/place';
import type { RidePhase } from '@/types/ride';

import { isActivePhase, type FinalRidePhase, type RidePlaces, type RideSnapshot } from './snapshot';
import type { CancelReason, CreatedRide, RideDriver, RideFare, RideRouteInfo } from './types';

export interface RideState {
  phase: RidePhase;
  rideId: number | null;
  /** Assigned driver (never the one a Searching update only offered the ride to). */
  driverId: number | null;
  pickup: Place | null;
  destination: Place | null;
  vehicleType: VehicleType;
  fare: RideFare | null;
  /** Trip estimate from the create response (summary). */
  tripKm: number | null;
  tripMinutes: number | null;
  driver: RideDriver | null;
  /** Memory only — never persisted. */
  driverLocation: LatLng | null;
  polylines: { toPickup: string | null; trip: string | null };
  /** Live ETA / distance for the current leg (to pickup, then to destination). */
  etaMinutes: number | null;
  remainingKm: number | null;
  cancelReason: CancelReason | null;
  searchStartedAt: number | null;
  updatedAt: number | null;
}

/** What a ride is ordered from (the booking draft at the moment of ordering). */
export interface RideDraft {
  pickup: Place;
  destination: Place;
  vehicleType: VehicleType;
}

interface RideActions {
  /**
   * The order succeeded. False when the store can't take it (a ride is already active, a
   * double order): the caller must cancel that ride so it isn't left searching unseen.
   */
  startSearching: (created: CreatedRide, draft: RideDraft) => boolean;
  driverAssigned: (info: RideRouteInfo) => void;
  driverArrived: (info: RideRouteInfo) => void;
  rideStarted: (info: RideRouteInfo) => void;
  rideFinished: (finalPrice: number | null) => void;
  rideCancelled: (reason: CancelReason) => void;
  /**
   * Nobody accepted. The store lets go of the ride id: events for it (e.g. the cancel the app
   * sends for it) are ignored from now on, and Retry orders a new ride.
   */
  noDriverFound: () => void;
  /** Route info for the current phase (ETA, polylines…) without a phase change. */
  updateRoute: (info: RideRouteInfo) => void;
  updateDriverLocation: (location: LatLng) => void;
  /** Persisted ride after a restart (only onto an idle store). */
  restore: (snapshot: RideSnapshot, places: RidePlaces | null) => void;
  /** Recovery found the ride finished in trip history while the app was away. */
  finishFromHistory: (phase: FinalRidePhase, trip: Trip) => void;
  /** Recovery finished loading the persisted ride (or found none): live events may apply. */
  markHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

export type RideStore = RideState &
  RideActions & {
    /** False until recovery has loaded the persisted ride; hub events are held until then. */
    hydrated: boolean;
  };

/**
 * Which phase may follow which. Anything else (duplicate, late or out-of-order hub events)
 * is ignored. Skipping ahead is allowed: events can be missed while offline.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<RidePhase, readonly RidePhase[]>> = {
  idle: ['searching'],
  searching: [
    'driver_assigned',
    'driver_arrived',
    'in_progress',
    'completed',
    'cancelled',
    'no_driver',
  ],
  driver_assigned: ['driver_arrived', 'in_progress', 'completed', 'cancelled'],
  driver_arrived: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  // The ride is let go of (and cancelled when the app timed out): only a new search or giving up.
  no_driver: ['searching', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const canTransition = (from: RidePhase, to: RidePhase): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

/** Phases with a driver whose location is tracked. */
export const TRACKING_PHASES: ReadonlySet<RidePhase> = new Set([
  'driver_assigned',
  'driver_arrived',
  'in_progress',
]);

const INITIAL: RideState = {
  phase: 'idle',
  rideId: null,
  driverId: null,
  pickup: null,
  destination: null,
  vehicleType: VEHICLE_TYPE.Economy,
  fare: null,
  tripKm: null,
  tripMinutes: null,
  driver: null,
  driverLocation: null,
  polylines: { toPickup: null, trip: null },
  etaMinutes: null,
  remainingKm: null,
  cancelReason: null,
  searchStartedAt: null,
  updatedAt: null,
};

const unnamedPlace = (location: LatLng): Place => ({
  placeId: null,
  title: '',
  subtitle: '',
  location,
});

/** Merge route info: only fields the event carried replace what we have. */
function routePatch(s: RideState, info: RideRouteInfo): Partial<RideState> {
  return {
    driverId: info.driverId ?? s.driverId,
    driverLocation: info.driverLocation ?? s.driverLocation,
    // Places come from the order; the hub only fills them in after a restore without them.
    pickup: s.pickup ?? (info.pickupLocation ? unnamedPlace(info.pickupLocation) : null),
    destination:
      s.destination ?? (info.destinationLocation ? unnamedPlace(info.destinationLocation) : null),
    polylines: {
      toPickup: info.toPickup ?? s.polylines.toPickup,
      trip: info.trip ?? s.polylines.trip,
    },
    etaMinutes: info.etaMinutes ?? s.etaMinutes,
    remainingKm: info.remainingKm ?? s.remainingKm,
    driver: info.driver ?? s.driver,
  };
}

/**
 * The passenger's ride: one state machine driven by the order, user-hub events and recovery.
 * Persisted by `startRidePersistence` (persistence.ts); see .claude/skills/ride-flow.
 */
export const useRideStore = create<RideStore>()((set, get) => {
  /** Move to `to` (or refresh the current phase); false when the transition isn't allowed. */
  const advance = (to: RidePhase, info: RideRouteInfo = {}, extra: Partial<RideState> = {}) => {
    const s = get();
    const now = Date.now();
    if (s.phase === to) {
      // Route refresh (ETA, polyline): updatedAt marks phase changes only, so these don't
      // rewrite storage or invalidate a recovery check in flight.
      set({ ...routePatch(s, info), ...extra });
      return true;
    }
    if (!canTransition(s.phase, to)) {
      logger.info('ride: ignored transition', { from: s.phase, to });
      return false;
    }
    // A new leg: the previous leg's ETA no longer applies.
    set({
      ...routePatch(s, info),
      etaMinutes: info.etaMinutes ?? null,
      remainingKm: info.remainingKm ?? null,
      ...extra,
      phase: to,
      updatedAt: now,
    });
    return true;
  };

  return {
    ...INITIAL,
    hydrated: false,
    startSearching: (created, draft) => {
      if (!canTransition(get().phase, 'searching')) {
        logger.info('ride: ignored transition', { from: get().phase, to: 'searching' });
        return false;
      }
      const now = Date.now();
      set({
        ...INITIAL,
        phase: 'searching',
        rideId: created.rideId,
        pickup: draft.pickup,
        destination: draft.destination,
        vehicleType: draft.vehicleType,
        fare: {
          estimated: created.estimatedFare,
          original: created.originalEstimatedFare,
          discount: created.discountAmount,
          promoCode: created.promo?.code ?? null,
          final: null,
        },
        tripKm: created.distanceKm,
        tripMinutes: created.durationMinutes,
        searchStartedAt: now,
        updatedAt: now,
      });
      return true;
    },
    driverAssigned: (info) => {
      advance('driver_assigned', info);
    },
    driverArrived: (info) => {
      advance('driver_arrived', info);
    },
    rideStarted: (info) => {
      advance('in_progress', info);
    },
    rideFinished: (finalPrice) => {
      const { fare } = get();
      advance(
        'completed',
        {},
        { fare: fare ? { ...fare, final: finalPrice ?? fare.final } : null },
      );
    },
    rideCancelled: (reason) => {
      advance('cancelled', {}, { cancelReason: reason });
    },
    noDriverFound: () => {
      advance('no_driver', {}, { rideId: null, driverId: null });
    },
    updateRoute: (info) => {
      const { phase } = get();
      if (isActivePhase(phase)) advance(phase, info);
    },
    updateDriverLocation: (location) => {
      if (TRACKING_PHASES.has(get().phase)) set({ driverLocation: location });
    },
    restore: (snapshot, places) => {
      if (get().phase !== 'idle') return; // never clobber live state
      set({
        ...INITIAL,
        ...snapshot,
        pickup: places?.pickup ?? null,
        destination: places?.destination ?? null,
      });
    },
    finishFromHistory: (phase, trip) => {
      const { fare } = get();
      const finalFare: RideFare | null =
        phase === 'completed'
          ? {
              estimated: fare?.estimated ?? trip.finalFare,
              original: trip.fare,
              discount: trip.discountAmount,
              promoCode: fare?.promoCode ?? null,
              final: trip.finalFare,
            }
          : fare;
      advance(
        phase,
        {},
        { fare: finalFare, cancelReason: phase === 'cancelled' ? 'unknown' : null },
      );
    },
    markHydrated: (hydrated) => set({ hydrated }),
    // Keeps `hydrated`: a reset is not a new app start.
    reset: () => set(INITIAL),
  };
});

/** For non-React callers (e.g. the realtime lifecycle's background keep-alive). */
export const hasActiveRide = (): boolean => isActivePhase(useRideStore.getState().phase);
