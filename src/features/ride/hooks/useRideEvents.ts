import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { cancelRide } from '@/api/services/rides';
import { SEARCH_TIMEOUT_MS } from '@/constants/timeouts';
import { i18n } from '@/i18n';
import { triggerHaptic } from '@/lib/haptics';
import {
  onUserHubEvent,
  subscribeToDriverLocation,
  unsubscribeFromDriverLocation,
  userHub,
} from '@/realtime/userHub';

import { handleDriverLocation, handleRideUpdate } from '../rideEvents';
import { TRACKING_PHASES, useRideStore } from '../store';

/**
 * Mounted once in the signed-in layout. User-hub events → ride store; follows the assigned
 * driver's location (re-subscribed after every reconnect); ends a search after
 * SEARCH_TIMEOUT_MS; haptics + screen-reader announcements on the moments that matter.
 */
export function useRideEvents(): void {
  useEffect(() => {
    const offs = [
      onUserHubEvent('rideStatusUpdated', handleRideUpdate),
      onUserHubEvent('driverLocationUpdated', handleDriverLocation),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  // Group membership is lost on reconnect, so subscribing is an on-connect action.
  const trackedDriverId = useRideStore((s) => (TRACKING_PHASES.has(s.phase) ? s.driverId : null));
  useEffect(() => {
    if (trackedDriverId === null) return;
    const remove = userHub.addOnConnect(() => subscribeToDriverLocation(trackedDriverId));
    return () => {
      remove();
      unsubscribeFromDriverLocation(trackedDriverId).catch(() => undefined);
    };
  }, [trackedDriverId]);

  // From the persisted start time, so the timeout also holds across an app restart.
  const searchDeadline = useRideStore((s) =>
    s.phase === 'searching' && s.searchStartedAt !== null
      ? s.searchStartedAt + SEARCH_TIMEOUT_MS
      : null,
  );
  useEffect(() => {
    if (searchDeadline === null) return;
    const timer = setTimeout(
      () => {
        const { rideId, noDriverFound } = useRideStore.getState();
        noDriverFound(); // lets go of rideId first: the resulting cancel event is ignored
        // The backend may still be searching: stop it, so no driver accepts a ride we don't show.
        if (rideId !== null) cancelRide(rideId).catch(() => undefined);
      },
      Math.max(0, searchDeadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [searchDeadline]);

  useEffect(
    () =>
      useRideStore.subscribe((state, prev) => {
        // Not on a restore (idle → …): nothing just happened.
        if (state.phase === prev.phase || prev.phase === 'idle' || state.phase === 'idle') return;
        AccessibilityInfo.announceForAccessibility(i18n.t(`ride.status.${state.phase}`));
        if (
          state.phase === 'driver_assigned' ||
          state.phase === 'driver_arrived' ||
          state.phase === 'completed'
        ) {
          triggerHaptic('success');
        } else if (state.phase === 'cancelled' && state.cancelReason !== 'user') {
          triggerHaptic('warning');
        }
      }),
    [],
  );
}
