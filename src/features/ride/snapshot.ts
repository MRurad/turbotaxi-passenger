import { z } from 'zod';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { getJSON, removeItem, setJSON } from '@/lib/storage';
import type { RidePhase } from '@/types/ride';

export const ACTIVE_RIDE_PHASES = [
  'searching',
  'driver_assigned',
  'driver_arrived',
  'in_progress',
] as const satisfies readonly RidePhase[];

export const FINAL_RIDE_PHASES = [
  'completed',
  'cancelled',
  'no_driver',
] as const satisfies readonly RidePhase[];

export type ActiveRidePhase = (typeof ACTIVE_RIDE_PHASES)[number];
export type FinalRidePhase = (typeof FINAL_RIDE_PHASES)[number];

export const isActivePhase = (phase: RidePhase): phase is ActiveRidePhase =>
  (ACTIVE_RIDE_PHASES as readonly RidePhase[]).includes(phase);
export const isFinalPhase = (phase: RidePhase): phase is FinalRidePhase =>
  (FINAL_RIDE_PHASES as readonly RidePhase[]).includes(phase);

/**
 * What survives an app restart (AsyncStorage, so ids only — never PII). Everything else
 * (driver, polylines, location) comes back over SignalR after resubscribing.
 */
export const rideSnapshotSchema = z.object({
  rideId: z.number().int(),
  phase: z.enum([...ACTIVE_RIDE_PHASES, ...FINAL_RIDE_PHASES]),
  /** Assigned driver, to re-run SubscribeToDriverLocation. */
  driverId: z.number().int().nullable(),
  /** Epoch ms of the last state change (staleness fallback). */
  updatedAt: z.number(),
});

export type RideSnapshot = z.infer<typeof rideSnapshotSchema>;

export const loadRideSnapshot = () => getJSON(STORAGE_KEYS.activeRide, rideSnapshotSchema);
export const saveRideSnapshot = (snapshot: RideSnapshot) =>
  setJSON(STORAGE_KEYS.activeRide, snapshot);
export const clearRideSnapshot = () => removeItem(STORAGE_KEYS.activeRide);
