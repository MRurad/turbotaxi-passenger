import {
  clearRidePlaces,
  clearRideSnapshot,
  saveRidePlaces,
  saveRideSnapshot,
  type RidePlaces,
  type RideSnapshot,
} from './snapshot';
import { useRideStore, type RideState } from './store';

/** The persistable part of the store (null while idle or incomplete). */
export function snapshotOf(s: RideState): RideSnapshot | null {
  if (s.phase === 'idle' || s.rideId === null || !s.fare) return null;
  if (s.searchStartedAt === null || s.updatedAt === null) return null;
  return {
    rideId: s.rideId,
    phase: s.phase,
    driverId: s.driverId,
    vehicleType: s.vehicleType,
    fare: s.fare,
    tripKm: s.tripKm,
    tripMinutes: s.tripMinutes,
    searchStartedAt: s.searchStartedAt,
    updatedAt: s.updatedAt,
  };
}

const placesOf = (s: RideState): RidePlaces | null =>
  snapshotOf(s) && s.pickup && s.destination
    ? { pickup: s.pickup, destination: s.destination }
    : null;

/**
 * Mirrors the store to storage: the snapshot (AsyncStorage, no PII) and the places
 * (SecureStore). Writes only when they change, so driver-location updates never hit storage.
 * Starts from "nothing saved yet": a fresh idle store doesn't wipe a ride still to recover.
 */
export function startRidePersistence(): () => void {
  let savedSnapshot = JSON.stringify(null);
  let savedPlaces = JSON.stringify(null);
  return useRideStore.subscribe((state) => {
    const snapshot = snapshotOf(state);
    const snapshotKey = JSON.stringify(snapshot);
    if (snapshotKey !== savedSnapshot) {
      savedSnapshot = snapshotKey;
      (snapshot ? saveRideSnapshot(snapshot) : clearRideSnapshot()).catch(() => undefined);
    }
    const places = placesOf(state);
    const placesKey = JSON.stringify(places);
    if (placesKey !== savedPlaces) {
      savedPlaces = placesKey;
      (places ? saveRidePlaces(places) : clearRidePlaces()).catch(() => undefined);
    }
  });
}

/** Forget a persisted ride (expired / unrecoverable). */
export async function clearPersistedRide(): Promise<void> {
  await Promise.all([clearRideSnapshot(), clearRidePlaces()]);
}
