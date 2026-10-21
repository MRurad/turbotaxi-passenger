import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Card, Skeleton, Text } from '@/components/ui';
import { VEHICLES, type VehicleType } from '@/constants/vehicles';
import { makeStyles, useTheme } from '@/theme';

import type { RideDriver } from '../types';

export interface DriverCardProps {
  /** Null until the backend sends driver details (docs/BACKEND_REQUESTS.md #1). */
  driver: RideDriver | null;
  vehicleType: VehicleType;
  /** The driver's name / car are being fetched: placeholders instead of the fallback. */
  loading?: boolean;
}

const WHITESPACE = /\s+/g;
/** Separators left over by a missing part ("Toyota Camry, " → "Toyota Camry"). */
const DANGLING_SEPARATORS = /^[\s,]+|[\s,]+$/g;

/** Driver: avatar initials, name, car and a big plate number. Falls back gracefully. */
export function DriverCard({ driver, vehicleType, loading = false }: DriverCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, sizes } = useTheme();
  const name = driver?.name ?? t('ride.driver.fallbackName');
  const hasCar = Boolean(driver?.brand || driver?.model);
  const car = hasCar
    ? t('ride.driver.car', {
        color: driver?.color ?? '',
        brand: driver?.brand ?? '',
        model: driver?.model ?? '',
      })
        .replace(WHITESPACE, ' ')
        .replace(DANGLING_SEPARATORS, '')
    : t(VEHICLES[vehicleType].labelKey);
  const plate = driver?.plateNumber ?? null;

  if (loading) {
    return (
      <Card variant="outlined" padding="lg" testID="driver-card-loading">
        <View style={styles.row} accessible accessibilityLabel={t('common.labels.loading')}>
          <Skeleton circle={sizes.avatar.md} />
          <View style={styles.text}>
            <Skeleton width="60%" height={sizes.icon.md} />
            <Skeleton width="40%" height={sizes.icon.sm} />
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="outlined" padding="lg" testID="driver-card">
      <View style={styles.row}>
        {driver?.name ? (
          <Avatar name={driver.name} size="md" />
        ) : (
          <View style={styles.placeholder} accessible={false}>
            <Ionicons name="person" size={sizes.icon.lg} color={colors.primary} />
          </View>
        )}
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {car}
          </Text>
        </View>
        {plate ? (
          <View
            style={styles.plate}
            accessible
            accessibilityLabel={t('ride.driver.plate', { plate })}
            testID="driver-plate"
          >
            <Text variant="heading">{plate}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  text: { flex: 1, gap: t.spacing.xxs },
  placeholder: {
    width: t.sizes.avatar.md,
    height: t.sizes.avatar.md,
    borderRadius: t.radii.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    borderWidth: t.sizes.plateBorder,
    borderColor: t.colors.textPrimary,
    borderRadius: t.radii.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
  },
}));
