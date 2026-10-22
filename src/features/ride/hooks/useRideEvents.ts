import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { toApiError } from '@/api/errors';
import { cancelRide } from '@/api/services/rides';
import { queryKeys } from '@/constants/queryKeys';
import {
  CANCEL_RETRY_DELAY_MS,
  SEARCH_TIMEOUT_GRACE_MS,
  SEARCH_TIMEOUT_MS,
} from '@/constants/timeouts';
import { useAuthStore } from '@/features/auth/store';
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
 * Stops the server-side search of a ride we gave up on, so no driver accepts it. After a
 * network error it tries once more: when the network is back, or shortly if NetInfo already
 * says online. Never for another session (logout / user switch in between).
 */
function cancelAbandonedRide(rideId: number): void {
  const userId = useAuthStore.getState().user?.id;
  const retry = () => {
    if (userId === undefined || useAuthStore.getState().user?.id !== userId) return;
    cancelRide(rideId).catch(() => undefined);
  };
  cancelRide(rideId).catch((error: unknown) => {
    const { code } = toApiError(error);
    if (code !== 'network' && code !== 'timeout') return;
    if (onlineManager.isOnline()) {
      setTimeout(retry, CANCEL_RETRY_DELAY_MS);
      return;
    }
    const off = onlineManager.subscribe((online) => {
      if (!online) return;
      off();
      retry();
    });
  });
}

/**
 * Mounted once in the signed-in layout. User-hub events → ride store; follows the assigned
 * driver's location (re-subscribed after every reconnect); ends a search after
 * SEARCH_TIMEOUT_MS; haptics + screen-reader announcements on the moments that matter.
 */
export function useRideEvents(): void {
  const queryClient = useQueryClient();

  useEffect(
    () =>
      useRideStore.subscribe((state, prev) => {
        if (state.phase === prev.phase) return;
        if (state.phase !== 'completed' && state.phase !== 'cancelled') return;
        for (const queryKey of [
          queryKeys.tripHistoryAll(),
          queryKeys.promosAll(),
          queryKeys.promoListAll(),
        ]) {
          queryClient.invalidateQueries({ queryKey }).catch(() => undefined);
        }
      }),
    [queryClient],
  );

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
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => {
      // Hub down: an accept may be waiting to arrive (and recovery re-checks on connect).
      if (userHub.getState() !== 'connected') {
        timer = setTimeout(expire, SEARCH_TIMEOUT_GRACE_MS);
        return;
      }
      const { rideId, noDriverFound } = useRideStore.getState();
      noDriverFound(); // lets go of rideId first: the resulting cancel event is ignored
      if (rideId !== null) cancelAbandonedRide(rideId);
    };
    timer = setTimeout(expire, Math.max(0, searchDeadline - Date.now()));
    return () => clearTimeout(timer);
  }, [searchDeadline]);

  useEffect(
    () =>
      useRideStore.subscribe((state, prev) => {
        // Not on a restore (idle → …): nothing just happened.
        if (state.phase === prev.phase || prev.phase === 'idle' || state.phase === 'idle') return;
        // The driver dropped out: say so, not just "searching".
        const dropped = state.phase === 'searching' && state.driverDropped;
        AccessibilityInfo.announceForAccessibility(
          i18n.t(dropped ? 'ride.searching.driverDropped' : `ride.status.${state.phase}`),
        );
        if (dropped) {
          triggerHaptic('warning');
        } else if (
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
