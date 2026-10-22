import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CarMarker } from '@/features/map/components/CarMarker';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';
import { TimeBubbleMarker } from '@/features/map/components/TimeBubbleMarker';
import { routeAhead } from '@/lib/geo';

import { useRideMarkerLabels } from '../hooks/useRideMarkerLabels';
import { useRideRoute } from '../hooks/useRideRoute';
import { TRACKING_PHASES, useRideStore } from '../store';

/**
 * Pickup / destination markers with their time labels, the rest of the current leg's route
 * (from the car on) and the driver's car. (An ordered ride's places can't be changed: there is no endpoint for it.)
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
  const route = useRideRoute();
  const tracking = TRACKING_PHASES.has(phase);
  // Only what's still ahead of the car: the line shrinks as it drives.
  const line = useMemo(
    () => (driverLocation && tracking ? routeAhead(route, driverLocation).coordinates : route),
    [route, driverLocation, tracking],
  );
  const labels = useRideMarkerLabels();
  // Once the trip has started the car is at the pickup; only the destination matters.
  const showPickup = pickup !== null && phase !== 'in_progress';

  return (
    <>
      <RoutePolyline coordinates={line} />
      {showPickup ? (
        <PlaceMarker coordinate={pickup.location} kind="pickup" testID="ride-pickup-marker" />
      ) : null}
      {showPickup && labels.pickup ? (
        <TimeBubbleMarker
          coordinate={pickup.location}
          {...labels.pickup}
          testID="ride-pickup-time"
        />
      ) : null}
      {destination ? (
        <PlaceMarker
          coordinate={destination.location}
          kind="destination"
          testID="ride-destination-marker"
        />
      ) : null}
      {destination && labels.destination ? (
        <TimeBubbleMarker
          coordinate={destination.location}
          {...labels.destination}
          testID="ride-destination-time"
        />
      ) : null}
      {driverLocation && tracking ? <CarMarker coordinate={driverLocation} /> : null}
    </>
  );
});
