import { toApiError } from '@/api/errors';
import { getTripHistory } from '@/api/services/tripHistory';
import { FIRST_PAGE } from '@/constants/api';
import { ACTIVE_RIDE_STALE_MS } from '@/constants/timeouts';
import type { Trip } from '@/features/history/types';
import { logger } from '@/lib/logger';

import { isActivePhase, isFinalPhase, type FinalRidePhase, type RideSnapshot } from './snapshot';

/**
 * What to do with a persisted ride on app start / hub (re)connect. There is no GET ride or
 * active-ride endpoint (won't be added), so trip history is the only server-side check.
 */
export type RecoveryDecision =
  | { kind: 'none' }
  /** The ride ended while the app was away: show the summary / cancelled screen. */
  | { kind: 'finished'; phase: FinalRidePhase; trip: Trip }
  /**
   * Restore the store and resubscribe. The snapshot may already be final (killed on the
   * summary screen) — then just show it. A restored `searching` ride still goes through the
   * store's search timeout (SEARCH_TIMEOUT_MS from `updatedAt`), so it can't hang for 3 h.
   */
  | { kind: 'restore'; snapshot: RideSnapshot }
  /** Last-resort fallback: too old to trust, reset to idle. */
  | { kind: 'expired' };

/**
 * `historyTrip`: the ride as found on the first trip-history page, null when it isn't there,
 * 'unavailable' when the request failed. Order: history says final → finished; otherwise the
 * 3 h staleness reset; otherwise restore.
 */
export function decideRecovery(
  snapshot: RideSnapshot | null,
  historyTrip: Trip | null | 'unavailable',
  now: number,
): RecoveryDecision {
  if (!snapshot) return { kind: 'none' };
  if (historyTrip && historyTrip !== 'unavailable') {
    const phase = historyTrip.status;
    if (phase !== 'unknown' && isFinalPhase(phase))
      return { kind: 'finished', phase, trip: historyTrip };
  }
  if (now - snapshot.updatedAt > ACTIVE_RIDE_STALE_MS) return { kind: 'expired' };
  return { kind: 'restore', snapshot };
}

/**
 * Checks an active snapshot against GET /api/TripHistory/user/{userId} (first page — newest
 * rides first) and decides. A failed request falls back to restore / staleness, so a flaky
 * network never ends a live ride; the next reconnect checks again.
 */
export async function checkPersistedRide(
  snapshot: RideSnapshot | null,
  { signal, now = Date.now() }: { signal?: AbortSignal; now?: number } = {},
): Promise<RecoveryDecision> {
  // A final snapshot (e.g. killed on the summary screen) needs no server check.
  if (!snapshot || !isActivePhase(snapshot.phase)) return decideRecovery(snapshot, null, now);
  let historyTrip: Trip | null | 'unavailable';
  try {
    const page = await getTripHistory(FIRST_PAGE, { signal });
    historyTrip = page.items.find((trip) => trip.rideId === snapshot.rideId) ?? null;
  } catch (error) {
    const apiError = toApiError(error);
    // No session: nothing to restore (the 401 handler is already signing the user out).
    if (apiError.code === 'cancelled' || apiError.code === 'sessionExpired') throw apiError;
    logger.warn('ride recovery: trip history unavailable', { code: apiError.code });
    historyTrip = 'unavailable';
  }
  return decideRecovery(snapshot, historyTrip, now);
}

/**
 * A decision is applied only if the ride hasn't moved on while history was being fetched
 * (a RideStatusUpdated can land during the request on a reconnect).
 */
export function isStillCurrent(
  checked: RideSnapshot | null,
  current: RideSnapshot | null,
): boolean {
  if (!checked || !current) return checked === current;
  return checked.rideId === current.rideId && checked.updatedAt === current.updatedAt;
}
