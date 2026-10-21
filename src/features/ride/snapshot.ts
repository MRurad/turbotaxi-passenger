import { z } from 'zod';

import { SECURE_KEYS, STORAGE_KEYS } from '@/constants/storageKeys';
import { VEHICLE_TYPES, type VehicleType } from '@/constants/vehicles';
import { getSecureJSON, removeSecureItem, setSecureJSON } from '@/lib/secureStorage';
import { getJSON, removeItem, setJSON } from '@/lib/storage';
import { placeSchema } from '@/types/place';
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

const vehicleTypeSchema = z
  .number()
  .int()
  .refine((value): value is VehicleType => (VEHICLE_TYPES as readonly number[]).includes(value));

/**
 * What survives an app restart in AsyncStorage: ids, phase and prices — never PII. The places
 * live in SecureStore (below); driver, polylines and location come back over SignalR.
 */
export const rideSnapshotSchema = z.object({
  rideId: z.number().int(),
  phase: z.enum([...ACTIVE_RIDE_PHASES, ...FINAL_RIDE_PHASES]),
  /** Assigned driver, to re-run SubscribeToDriverLocation. */
  driverId: z.number().int().nullable(),
  vehicleType: vehicleTypeSchema,
  fare: z.object({
    estimated: z.number(),
    original: z.number(),
    discount: z.number(),
    promoCode: z.string().nullable(),
    final: z.number().nullable(),
  }),
  /** Trip estimate from the create response (summary). */
  tripKm: z.number().nullable(),
  tripMinutes: z.number().nullable(),
  /** Epoch ms when the search (re)started — the no-driver timeout survives a restart. */
  searchStartedAt: z.number(),
  /** Epoch ms of the last state change (staleness fallback). */
  updatedAt: z.number(),
});

export type RideSnapshot = z.infer<typeof rideSnapshotSchema>;

export const loadRideSnapshot = () => getJSON(STORAGE_KEYS.activeRide, rideSnapshotSchema);
export const saveRideSnapshot = (snapshot: RideSnapshot) =>
  setJSON(STORAGE_KEYS.activeRide, snapshot);
export const clearRideSnapshot = () => removeItem(STORAGE_KEYS.activeRide);

/** Pickup + destination of the active ride (SecureStore: addresses are personal data). */
export const ridePlacesSchema = z.object({ pickup: placeSchema, destination: placeSchema });
export type RidePlaces = z.infer<typeof ridePlacesSchema>;

export const loadRidePlaces = () => getSecureJSON(SECURE_KEYS.activeRidePlaces, ridePlacesSchema);
export const saveRidePlaces = (places: RidePlaces) =>
  setSecureJSON(SECURE_KEYS.activeRidePlaces, places);
export const clearRidePlaces = () => removeSecureItem(SECURE_KEYS.activeRidePlaces);
