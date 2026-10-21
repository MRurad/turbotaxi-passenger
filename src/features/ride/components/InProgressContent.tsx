import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { Button, Text, useToast } from '@/components/ui';
import { PlaceLine } from '@/features/home/components/PlaceLine';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDuration } from '@/lib/format';

import { useRideStore } from '../store';
import { RideFareRow } from './RideFareRow';

/** The trip: destination, ETA, class + price, share (placeholder). */
export function InProgressContent() {
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const toast = useToast();
  const { destination, etaMinutes } = useRideStore(
    useShallow((s) => ({ destination: s.destination, etaMinutes: s.etaMinutes })),
  );

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
      <PlaceLine
        kind="destination"
        label={t('common.labels.destination')}
        value={destination?.title || t('ride.destinationUnknown')}
      />
      <RideFareRow />
      <Button
        label={t('ride.inProgress.shareTrip')}
        variant="secondary"
        leftIcon="share-outline"
        fullWidth
        // Sharing a live trip needs a backend link (later).
        onPress={() => toast.show({ message: t('common.labels.comingSoon') })}
        testID="ride-share"
      />
    </>
  );
}
