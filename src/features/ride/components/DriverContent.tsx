import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button, Card, Text, useToast } from '@/components/ui';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatDuration } from '@/lib/format';
import { makeStyles } from '@/theme';

import { TEL_URL_SCHEME } from '../constants';
import { useDriverProfile } from '../hooks/useDriverProfile';
import { useRideStore } from '../store';
import { mergeDriver } from '../utils';
import { ChatButton } from './ChatButton';
import { DriverCard } from './DriverCard';
import { RideCancelButton } from './RideCancelButton';

/** Driver on the way / arrived: status, ETA, driver card, Call / Chat, Cancel. */
export function DriverContent() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const toast = useToast();
  const { phase, driverId, eventDriver, vehicleType, etaMinutes } = useRideStore(
    useShallow((s) => ({
      phase: s.phase,
      driverId: s.driverId,
      eventDriver: s.driver,
      vehicleType: s.vehicleType,
      etaMinutes: s.etaMinutes,
    })),
  );
  const profile = useDriverProfile(driverId);
  const driver = mergeDriver(eventDriver, profile.data ?? null);
  const arrived = phase === 'driver_arrived';
  const phone = driver?.phoneNumber ?? null;

  const call = () => {
    if (!phone) return;
    Linking.openURL(`${TEL_URL_SCHEME}${phone}`).catch(() =>
      toast.show({ message: t('errors.unknown'), tone: 'danger' }),
    );
  };

  return (
    <>
      {arrived ? (
        <Card variant="soft" padding="lg" animated testID="ride-arrived">
          <Text variant="heading" color="primaryText" accessibilityRole="header">
            {t('ride.driverArrived.title')}
          </Text>
          <Text variant="body" color="primaryText">
            {t('ride.driverArrived.message')}
          </Text>
        </Card>
      ) : (
        <View style={styles.status}>
          <Text variant="heading" accessibilityRole="header">
            {t('ride.driverOnTheWay.title')}
          </Text>
          {etaMinutes !== null ? (
            <Text variant="body" color="textSecondary" testID="ride-eta">
              {t('ride.driverOnTheWay.eta', { duration: formatDuration(etaMinutes, language) })}
            </Text>
          ) : null}
        </View>
      )}
      <DriverCard
        driver={driver}
        vehicleType={vehicleType}
        loading={profile.isLoading && !eventDriver}
      />
      <View style={styles.actions}>
        {phone ? (
          <Button
            // Short label fits two buttons side by side on small phones (ru/az).
            label={t('common.actions.call')}
            accessibilityLabel={t('ride.driver.call')}
            variant="secondary"
            leftIcon="call"
            onPress={call}
            style={styles.action}
            testID="ride-call"
          />
        ) : null}
        <ChatButton style={styles.action} />
      </View>
      <RideCancelButton />
    </>
  );
}

const useStyles = makeStyles((t) => ({
  status: { gap: t.spacing.xxs },
  actions: { flexDirection: 'row', gap: t.spacing.md },
  action: { flex: 1 },
}));
