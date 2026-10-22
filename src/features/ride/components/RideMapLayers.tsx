import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CarMarker } from '@/features/map/components/CarMarker';
import { MarkerLabel } from '@/features/map/components/MarkerLabel';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';

import { useRideMarkerLabels } from '../hooks/useRideMarkerLabels';
import { useRideRoute } from '../hooks/useRideRoute';
import { TRACKING_PHASES, useRideStore } from '../store';

/**
 * Pickup / destination markers with their time labels, the current leg's route and the
 * driver's car. (An ordered ride's places can't be changed: there is no endpoint for it.)
 */
export const RideMapLayers = memo(function RideMapLayers() {
  const { phase, pickup, destination, driverLocation } = useRideStore(
    useShallow((s) => ({
      phase: s.phase,
      pickup: s.pickup,
      destination: s.destination,
      driverLocation: s.driverLocation,
    })),
  );
  const line = useRideRoute();
  const labels = useRideMarkerLabels();
  // Once the trip has started the car is at the pickup; only the destination matters.
  const showPickup = pickup !== null && phase !== 'in_progress';

  return (
    <>
      {line ? <RoutePolyline encoded={line} /> : null}
      {showPickup ? <PlaceMarker coordinate={pickup.location} kind="pickup" /> : null}
      {showPickup && labels.pickup ? (
        <MarkerLabel coordinate={pickup.location} {...labels.pickup} testID="ride-pickup-label" />
      ) : null}
      {destination ? <PlaceMarker coordinate={destination.location} kind="destination" /> : null}
      {destination && labels.destination ? (
        <MarkerLabel
          coordinate={destination.location}
          {...labels.destination}
          testID="ride-destination-label"
        />
      ) : null}
      {driverLocation && TRACKING_PHASES.has(phase) ? (
        <CarMarker coordinate={driverLocation} />
      ) : null}
    </>
  );
});
