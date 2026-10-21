import type { DriverLocationEvent, RideStatusUpdatedEvent } from '@/realtime/events';

import { useRideStore } from './store';
import { cancelReasonFromStatus, phaseFromUpdate, routeInfoFromUpdate } from './utils';

/** Updates that arrived before recovery loaded the persisted ride (replayed once it has). */
const MAX_PENDING_UPDATES = 20;
let pending: RideStatusUpdatedEvent[] = [];

/**
 * RideStatusUpdated → named store transition. Events for another ride are ignored; the
 * store's transition table ignores duplicate / late ones. Until recovery has hydrated the
 * store, updates are held (a "driver accepted" right after launch must not be lost).
 */
export function handleRideUpdate(evt: RideStatusUpdatedEvent): void {
  const store = useRideStore.getState();
  if (!store.hydrated) {
    pending = [...pending, evt].slice(-MAX_PENDING_UPDATES);
    return;
  }
  if (store.rideId === null || evt.rideId !== store.rideId) return;
  const info = routeInfoFromUpdate(evt);
  switch (phaseFromUpdate(evt)) {
    case 'driver_assigned':
      store.driverAssigned(info);
      return;
    case 'driver_arrived':
      store.driverArrived(info);
      return;
    case 'in_progress':
      store.rideStarted(info);
      return;
    case 'completed':
      store.rideFinished(evt.finalPrice ?? null);
      return;
    case 'cancelled':
      store.rideCancelled(cancelReasonFromStatus(evt.status));
      return;
    case 'no_driver':
      store.noDriverFound();
      return;
    default:
      // Searching / unknown status: keep the phase, take any route info.
      store.updateRoute(info);
  }
}

/** Mark the store hydrated and apply the updates held meanwhile, in arrival order. */
export function flushPendingRideUpdates(): void {
  useRideStore.getState().markHydrated(true);
  const held = pending;
  pending = [];
  held.forEach(handleRideUpdate);
}

/** Session ended: drop held updates and hold new ones until the next hydration. */
export function resetPendingRideUpdates(): void {
  pending = [];
  useRideStore.getState().markHydrated(false);
}

/** DriverLocationUpdated → car marker, only for our assigned driver. */
export function handleDriverLocation({ driverId, latitude, longitude }: DriverLocationEvent): void {
  const store = useRideStore.getState();
  if (store.driverId !== driverId) return;
  store.updateDriverLocation({ latitude, longitude });
}
