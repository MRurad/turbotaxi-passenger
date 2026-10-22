import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { CLOCK_TICK_MS, MINUTE_MS } from '@/constants/timeouts';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatClock, formatDuration } from '@/lib/format';
import { useNow } from '@/lib/hooks/useNow';

import { useRideStore } from '../store';
import { useLiveEta } from './useLiveEta';

export interface RideMarkerLabel {
  /** Highlighted part: "18 min", "Driver in 4 min", "Driver is here". */
  title: string;
  /** Arrival clock time ("12:45"), when known. */
  time?: string;
  /** The whole thing as a sentence for screen readers. */
  accessibilityLabel: string;
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
  const etaMinutes = useLiveEta();
  const { phase, tripMinutes } = useRideStore(
    useShallow((s) => ({ phase: s.phase, tripMinutes: s.tripMinutes })),
  );

  const label = (title: string, arrivalInMinutes?: number): RideMarkerLabel => {
    if (arrivalInMinutes === undefined) return { title, accessibilityLabel: title };
    const time = formatClock(new Date(now + arrivalInMinutes * MINUTE_MS), language);
    return { title, time, accessibilityLabel: `${title}, ${t('common.map.arriveAt', { time })}` };
  };

  let pickup: RideMarkerLabel | null = null;
  if (phase === 'driver_arrived') pickup = label(t('common.map.driverHere'));
  else if (phase === 'driver_assigned' && etaMinutes !== null) {
    pickup = label(t('common.map.driverIn', { duration: formatDuration(etaMinutes, language) }));
  }

  let destination: RideMarkerLabel | null = null;
  if (phase === 'in_progress' && etaMinutes !== null) {
    destination = label(formatDuration(etaMinutes, language), etaMinutes);
  } else if (tripMinutes !== null) {
    const title = formatDuration(tripMinutes, language);
    if (phase === 'driver_assigned' && etaMinutes !== null) {
      destination = label(title, etaMinutes + tripMinutes);
    } else if (phase === 'driver_arrived') {
      destination = label(title, tripMinutes);
    } else if (phase === 'searching' || phase === 'driver_assigned' || phase === 'in_progress') {
      destination = label(title);
    }
  }
  return { pickup, destination };
}
