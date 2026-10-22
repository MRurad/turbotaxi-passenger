import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDuration } from '@/lib/format';

import { useRideStore } from '../store';
import { RideFareRow } from './RideFareRow';
import { RideRoute } from './RideRoute';

/**
 * The trip: destination, ETA, class + price. ("Share trip" waits for a backend share link;
 * a button that only says "coming soon" is left out.)
 */
export function InProgressContent() {
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const etaMinutes = useRideStore((s) => s.etaMinutes);

  return (
    <>
      <Text variant="heading" accessibilityRole="header">
        {t('ride.inProgress.title')}
      </Text>
      {etaMinutes !== null ? (
        <Text variant="body" color="textSecondary" testID="ride-eta">
          {t('ride.inProgress.eta', { duration: formatDuration(etaMinutes, language) })}
        </Text>
      ) : null}
      <RideRoute show="destination" />
      <RideFareRow />
    </>
  );
}
