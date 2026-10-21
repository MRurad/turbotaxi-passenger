import { mapBackendStatus } from '@/constants/rideStatus';
import { ROUTE_SEGMENTS, ROUTES } from '@/constants/routes';
import type { RideStatusUpdatedEvent } from '@/realtime/events';
import type { LatLng } from '@/types/geo';
import type { RidePhase } from '@/types/ride';

import { isActivePhase } from './snapshot';
import type { CancelReason, RideDriver, RideRouteInfo } from './types';

const POLYLINE_PHASE_TO_RIDE: Readonly<Record<string, RidePhase>> = {
  approach: 'driver_assigned',
  enroute: 'in_progress',
};

const polylinePhaseOf = (evt: RideStatusUpdatedEvent): RidePhase | null =>
  POLYLINE_PHASE_TO_RIDE[(evt.polylinePhase ?? '').toLowerCase()] ?? null;

/**
 * The phase a RideStatusUpdated moves the ride to, or null to leave it as is.
 * - The status string wins when known (docs/REALTIME_CONTRACT.md).
 * - `polylinePhase` breaks ties: the accepted status wasn't captured yet ("Approach" = driver
 *   coming), and `OnWay` + "Approach" means the driver is on the way, not the trip.
 * - `Searching` stays searching even with a driverId (that driver was only offered the ride).
 */
export function phaseFromUpdate(evt: RideStatusUpdatedEvent): RidePhase | null {
  const mapped = mapBackendStatus(evt.status);
  const byPolyline = polylinePhaseOf(evt);
  if (mapped === 'unknown') return byPolyline;
  if (mapped === 'in_progress' && byPolyline === 'driver_assigned') return 'driver_assigned';
  return mapped;
}

/** "CancelledByDriver" → driver, "CancelledByUser" → user, plain "Cancelled" → unknown. */
export function cancelReasonFromStatus(status: string): CancelReason {
  const key = status.toLowerCase();
  if (key.includes('driver')) return 'driver';
  if (key.includes('user')) return 'user';
  return 'unknown';
}

const point = (lat: number | null | undefined, lng: number | null | undefined) =>
  typeof lat === 'number' && typeof lng === 'number' ? { latitude: lat, longitude: lng } : null;

function driverOf(evt: RideStatusUpdatedEvent): RideDriver | undefined {
  const driver: RideDriver = {
    name: [evt.driverName, evt.driverSurname].filter(Boolean).join(' ') || null,
    phoneNumber: evt.driverPhoneNumber ?? null,
    plateNumber: evt.vehiclePlateNumber ?? null,
    brand: evt.vehicleBrand ?? null,
    model: evt.vehicleModel ?? null,
    color: evt.vehicleColor ?? null,
  };
  return Object.values(driver).some(Boolean) ? driver : undefined;
}

/** Route info to merge into the store. Only fields the event actually carries are set. */
export function routeInfoFromUpdate(evt: RideStatusUpdatedEvent): RideRouteInfo {
  const info: RideRouteInfo = {};
  const set = <K extends keyof RideRouteInfo>(key: K, value: RideRouteInfo[K] | null) => {
    if (value !== null && value !== undefined) info[key] = value;
  };
  const polyline = polylinePhaseOf(evt);
  // Searching carries the driver the ride was offered to — not ours (yet).
  if (mapBackendStatus(evt.status) !== 'searching') set('driverId', evt.driverId ?? null);
  set('driverLocation', point(evt.driverLat, evt.driverLng));
  set('pickupLocation', point(evt.pickupLat, evt.pickupLng));
  set('destinationLocation', point(evt.destinationLat, evt.destinationLng));
  if (polyline === 'driver_assigned') set('toPickup', evt.encodedPolyline ?? null);
  set('trip', evt.tripEncodedPolyline ?? (polyline === 'in_progress' ? evt.encodedPolyline : null));
  set('etaMinutes', evt.durationMinutes ?? null);
  set('remainingKm', evt.distanceKm ?? null);
  set('driver', driverOf(evt) ?? null);
  return info;
}

/** The encoded route to draw in this phase: driver → pickup, then the trip. */
export function activePolyline(
  phase: RidePhase,
  polylines: { toPickup: string | null; trip: string | null },
): string | null {
  if (phase === 'driver_assigned' || phase === 'driver_arrived') return polylines.toPickup;
  if (phase === 'in_progress') return polylines.trip;
  return null;
}

/** Points to frame on the ride map: what matters in this phase. */
export function framePoints(
  phase: RidePhase,
  {
    car,
    pickup,
    destination,
  }: { car: LatLng | null; pickup: LatLng | null; destination: LatLng | null },
): LatLng[] {
  const toPickup = phase === 'driver_assigned' || phase === 'driver_arrived';
  const points = toPickup ? [car, pickup] : phase === 'in_progress' ? [car, destination] : [pickup];
  return points.filter((p): p is LatLng => p !== null);
}

const RIDE_SEGMENT = ROUTE_SEGMENTS.ride;
const SUMMARY_SEGMENT = ROUTE_SEGMENTS.rideSummary;
/** Other signed-in screens reachable during an active ride (chat joins in Prompt 10). */
const ALLOWED_DURING_RIDE: ReadonlySet<string> = new Set<string>();

/**
 * Where the ride guard should send the user, or null to stay. `segments` are expo-router
 * segments inside the signed-in group, e.g. ['(app)', 'ride', 'summary'].
 */
export function rideRedirect(phase: RidePhase, segments: readonly string[]) {
  if (segments[0] !== ROUTE_SEGMENTS.signedIn) return null; // dev screens etc. are never hijacked
  const section = segments[1] ?? '';
  const onSummary = section === RIDE_SEGMENT && segments[2] === SUMMARY_SEGMENT;
  const onRide = section === RIDE_SEGMENT && !onSummary;
  if (phase === 'completed') return onSummary ? null : ROUTES.rideSummary;
  if (phase === 'idle') return section === RIDE_SEGMENT ? ROUTES.home : null;
  // Active, cancelled and no-driver phases live on /ride.
  if (onRide) return null;
  if (isActivePhase(phase) && ALLOWED_DURING_RIDE.has(section)) return null;
  return ROUTES.ride;
}
