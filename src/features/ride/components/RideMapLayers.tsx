import { useShallow } from 'zustand/react/shallow';

import { CarMarker } from '@/features/map/components/CarMarker';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';

import { TRACKING_PHASES, useRideStore } from '../store';
import { activePolyline } from '../utils';

/** Pickup / destination markers, the current leg's route and the driver's car. */
export function RideMapLayers() {
  const { phase, pickup, destination, driverLocation, polylines } = useRideStore(
    useShallow((s) => ({
      phase: s.phase,
      pickup: s.pickup,
      destination: s.destination,
      driverLocation: s.driverLocation,
      polylines: s.polylines,
    })),
  );
  const line = activePolyline(phase, polylines);

  return (
    <>
      {line ? <RoutePolyline encoded={line} /> : null}
      {/* Once the trip has started the car is at the pickup; only the destination matters. */}
      {pickup && phase !== 'in_progress' ? (
        <PlaceMarker coordinate={pickup.location} kind="pickup" />
      ) : null}
      {destination ? <PlaceMarker coordinate={destination.location} kind="destination" /> : null}
      {driverLocation && TRACKING_PHASES.has(phase) ? (
        <CarMarker coordinate={driverLocation} />
      ) : null}
    </>
  );
}
