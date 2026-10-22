import { memo } from 'react';
import { useRoutePolyline } from '@/features/booking/hooks/useRoutePolyline';
import { useBookingDraft } from '@/features/booking/store';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';

/**
 * Markers + route on the home map. A point gets its own marker whenever the center pin isn't
 * choosing it; the route (from the estimates) only shows in booking mode.
 */
export const HomeMapLayers = memo(function HomeMapLayers() {
  const pickup = useBookingDraft((s) => s.pickup);
  const destination = useBookingDraft((s) => s.destination);
  const mapPick = useBookingDraft((s) => s.mapPick);
  const route = useRoutePolyline();
  const pinIsPickup = mapPick === 'pickup' || (mapPick === null && !destination);
  const showRoute = destination !== null && mapPick === null;

  return (
    <>
      {showRoute ? <RoutePolyline coordinates={route} /> : null}
      {pickup && !pinIsPickup ? <PlaceMarker coordinate={pickup.location} kind="pickup" /> : null}
      {destination && mapPick !== 'destination' ? (
        <PlaceMarker coordinate={destination.location} kind="destination" />
      ) : null}
    </>
  );
});
