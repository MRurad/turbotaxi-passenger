import type { RidePhase } from '@/types/ride';

export type MappedRideStatus = RidePhase | 'unknown';

// Seen on the hub: Searching, OnWay, Completed. The rest are still guesses until the backend
// sends the full list (docs/BACKEND_REQUESTS.md #5).
// Keys are lowercase; lookups are case-insensitive.
export const BACKEND_STATUS_MAP: Readonly<Record<string, RidePhase>> = {
  pending: 'searching',
  searching: 'searching',
  accepted: 'driver_assigned',
  driverassigned: 'driver_assigned',
  arrived: 'driver_arrived',
  driverarrived: 'driver_arrived',
  inprogress: 'in_progress',
  // Captured with startedAt + polylinePhase "EnRoute" ("Trip started!"). TODO confirm
  // (BACKEND_REQUESTS #5); the ride store should use polylinePhase as a tie-breaker.
  onway: 'in_progress',
  started: 'in_progress',
  completed: 'completed',
  finished: 'completed',
  cancelled: 'cancelled',
  cancelledbyuser: 'cancelled',
  cancelledbydriver: 'cancelled',
  nodriverfound: 'no_driver',
  timeout: 'no_driver',
};

/** Normalizes a backend ride status string. Unknown or empty values map to 'unknown'. */
export function mapBackendStatus(status: string | null | undefined): MappedRideStatus {
  if (!status) return 'unknown';
  const key = status.replace(/[\s_-]/g, '').toLowerCase();
  return BACKEND_STATUS_MAP[key] ?? 'unknown';
}
