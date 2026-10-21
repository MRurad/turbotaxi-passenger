import { useRoutePolyline } from '@/features/booking/hooks/useRoutePolyline';
import { useBookingDraft } from '@/features/booking/store';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';

/**
 * Markers + route on the home map. The pickup gets its own marker whenever the center pin
 * isn't choosing it; the route comes from the estimates.
 */
export function HomeMapLayers() {
  const pickup = useBookingDraft((s) => s.pickup);
  const destination = useBookingDraft((s) => s.destination);
  const choosingDestination = useBookingDraft((s) => s.pinTarget === 'destination');
  const route = useRoutePolyline();
  const pinIsPickup = !choosingDestination && !destination;
  const showRoute = destination !== null && !choosingDestination;

  return (
    <>
      {showRoute ? <RoutePolyline coordinates={route} /> : null}
      {pickup && !pinIsPickup ? <PlaceMarker coordinate={pickup.location} kind="pickup" /> : null}
      {destination && !choosingDestination ? (
        <PlaceMarker coordinate={destination.location} kind="destination" />
      ) : null}
    </>
  );
}
