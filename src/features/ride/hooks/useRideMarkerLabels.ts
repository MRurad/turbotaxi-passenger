import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { CLOCK_TICK_MS, MINUTE_MS } from '@/constants/timeouts';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatClock, formatDuration } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';

import { useRideStore } from '../store';

export interface RideMarkerLabel {
  title: string;
  subtitle?: string;
}

export interface RideMarkerLabels {
  pickup: RideMarkerLabel | null;
  destination: RideMarkerLabel | null;
}

/**
 * Labels for the ride map. Pickup: how soon the driver gets there (live ETA of the approach).
 * Destination: trip time and arrival clock — once the driver comes, arrival = driver ETA +
 * trip; during the trip, the live remaining ETA. While searching only the trip time is known.
 */
export function useRideMarkerLabels(): RideMarkerLabels {
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const now = useNow(CLOCK_TICK_MS);
  const { phase, etaMinutes, tripMinutes } = useRideStore(
    useShallow((s) => ({ phase: s.phase, etaMinutes: s.etaMinutes, tripMinutes: s.tripMinutes })),
  );

  const arriveAt = (minutesFromNow: number) =>
    t('common.map.arriveAt', {
      time: formatClock(new Date(now + minutesFromNow * MINUTE_MS), language),
    });

  let pickup: RideMarkerLabel | null = null;
  if (phase === 'driver_arrived') pickup = { title: t('common.map.driverHere') };
  else if (phase === 'driver_assigned' && etaMinutes !== null) {
    pickup = {
      title: t('common.map.driverIn', { duration: formatDuration(etaMinutes, language) }),
    };
  }

  let destination: RideMarkerLabel | null = null;
  if (phase === 'in_progress' && etaMinutes !== null) {
    destination = { title: formatDuration(etaMinutes, language), subtitle: arriveAt(etaMinutes) };
  } else if (tripMinutes !== null) {
    const title = formatDuration(tripMinutes, language);
    if (phase === 'driver_assigned' && etaMinutes !== null) {
      destination = { title, subtitle: arriveAt(etaMinutes + tripMinutes) };
    } else if (phase === 'driver_arrived') {
      destination = { title, subtitle: arriveAt(tripMinutes) };
    } else if (phase === 'searching' || phase === 'driver_assigned' || phase === 'in_progress') {
      destination = { title };
    }
  }
  return { pickup, destination };
}
