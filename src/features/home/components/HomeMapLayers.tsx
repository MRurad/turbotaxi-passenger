import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { CLOCK_TICK_MS, MINUTE_MS } from '@/constants/timeouts';
import { useRoutePolyline } from '@/features/booking/hooks/useRoutePolyline';
import { useSelectedEstimate } from '@/features/booking/hooks/useSelectedEstimate';
import { useBookingDraft } from '@/features/booking/store';
import { MarkerLabel } from '@/features/map/components/MarkerLabel';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { RoutePolyline } from '@/features/map/components/RoutePolyline';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatClock, formatDuration } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';

/**
 * Markers + route on the home map. A point gets its own marker whenever the center pin isn't
 * choosing it; the route (from the estimates) only shows in booking mode. While booking, the
 * destination shows the trip time and arrival time, and tapping a marker moves that point
 * ("Choose on map", zoomed in on it).
 */
export const HomeMapLayers = memo(function HomeMapLayers() {
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const pickup = useBookingDraft((s) => s.pickup);
  const destination = useBookingDraft((s) => s.destination);
  const mapPick = useBookingDraft((s) => s.mapPick);
  const startPinPicking = useBookingDraft((s) => s.startPinPicking);
  const route = useRoutePolyline();
  const minutes = useSelectedEstimate()?.estimate?.durationMinutes;
  const now = useNow(CLOCK_TICK_MS);
  const duration = minutes === undefined ? '' : formatDuration(minutes, language);
  const arrival =
    minutes === undefined
      ? ''
      : t('common.map.arriveAt', {
          time: formatClock(new Date(now + minutes * MINUTE_MS), language),
        });
  const pinIsPickup = mapPick === 'pickup' || (mapPick === null && !destination);
  const booking = destination !== null && mapPick === null;

  return (
    <>
      {booking ? <RoutePolyline coordinates={route} /> : null}
      {pickup && !pinIsPickup ? (
        <PlaceMarker
          coordinate={pickup.location}
          kind="pickup"
          onPress={booking ? () => startPinPicking('pickup') : undefined}
          accessibilityLabel={booking ? t('booking.editPickup') : undefined}
        />
      ) : null}
      {destination && mapPick !== 'destination' ? (
        <PlaceMarker
          coordinate={destination.location}
          kind="destination"
          onPress={booking ? () => startPinPicking('destination') : undefined}
          accessibilityLabel={booking ? t('booking.editDestination') : undefined}
        />
      ) : null}
      {booking && minutes !== undefined ? (
        <MarkerLabel
          coordinate={destination.location}
          title={duration}
          subtitle={arrival}
          onPress={() => startPinPicking('destination')}
          accessibilityLabel={`${duration}, ${arrival}. ${t('booking.editDestination')}`}
          testID="home-destination-label"
        />
      ) : null}
    </>
  );
});
