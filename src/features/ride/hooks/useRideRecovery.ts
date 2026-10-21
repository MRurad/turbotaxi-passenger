import { useEffect } from 'react';

import { userHub } from '@/realtime/userHub';

import { clearPersistedRide, snapshotOf, startRidePersistence } from '../persistence';
import { flushPendingRideUpdates, resetPendingRideUpdates } from '../rideEvents';
import {
  checkPersistedRide,
  decideRecovery,
  isStillCurrent,
  type RecoveryDecision,
} from '../recovery';
import { loadRidePlaces, loadRideSnapshot } from '../snapshot';
import { useRideStore } from '../store';

function apply(decision: RecoveryDecision): void {
  const store = useRideStore.getState();
  if (decision.kind === 'finished') store.finishFromHistory(decision.phase, decision.trip);
  else if (decision.kind === 'expired') store.reset();
}

/**
 * Mounted once in the signed-in layout. Persists the ride, restores it after a restart and,
 * on start and every user-hub (re)connect, checks trip history for a ride that ended while
 * the app was away (there is no GET ride endpoint — docs/BACKEND_REQUESTS.md #3/#4).
 */
export function useRideRecovery(): void {
  useEffect(() => {
    const stopPersisting = startRidePersistence();
    const controller = new AbortController();
    let checking = false;

    const check = async () => {
      const checked = snapshotOf(useRideStore.getState());
      if (!checked || checking) return;
      checking = true;
      try {
        const decision = await checkPersistedRide(checked, { signal: controller.signal });
        // A hub event may have moved the ride on meanwhile: that newer state wins.
        if (isStillCurrent(checked, snapshotOf(useRideStore.getState()))) apply(decision);
      } catch {
        // Cancelled (unmount / logout) or signed out: nothing to apply.
      } finally {
        checking = false;
      }
    };

    const restore = async () => {
      const [snapshot, places] = await Promise.all([loadRideSnapshot(), loadRidePlaces()]);
      if (controller.signal.aborted || !snapshot) return;
      if (useRideStore.getState().phase !== 'idle') return;
      // Too old to trust: forget it without flashing it on screen (3 h last fallback).
      if (decideRecovery(snapshot, 'unavailable', Date.now()).kind === 'expired') {
        await clearPersistedRide();
        return;
      }
      // Show it right away; trip history may still move it to its final state.
      useRideStore.getState().restore(snapshot, places);
      await check();
    };

    // Live events are held until this has run, then replayed onto the restored ride.
    restore()
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) flushPendingRideUpdates();
      });
    // Never rejects: a failing on-connect action would make the hub reconnect.
    const removeOnConnect = userHub.addOnConnect(() => {
      check().catch(() => undefined);
    });
    return () => {
      controller.abort();
      resetPendingRideUpdates();
      removeOnConnect();
      stopPersisting();
    };
  }, []);
}
