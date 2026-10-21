import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IconButton, PressableScale, Skeleton, Text } from '@/components/ui';
import { VEHICLES } from '@/constants/vehicles';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { makeStyles, useTheme } from '@/theme';

import type { VehicleEstimate } from '../hooks/useRouteEstimates';
import { toEstimateView } from '../utils';

export interface VehicleRowProps {
  item: VehicleEstimate;
  selected: boolean;
  onSelect: () => void;
}

/** One vehicle class: icon, name, seats, trip duration and price (struck original if discounted). */
export function VehicleRow({ item, selected, onSelect }: VehicleRowProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes, motion } = useTheme();
  const vehicle = VEHICLES[item.vehicleType];
  const name = t(vehicle.labelKey);
  const seats = t('booking.seats', { count: vehicle.seats });
  const view = item.estimate ? toEstimateView(item.estimate, language) : null;
  // A retry after an error keeps status "error"; show progress instead of the stale error.
  const failed = Boolean(item.error) && !item.isFetching && !view;

  const icon = (
    <View style={[styles.icon, selected && styles.iconSelected]}>
      <Ionicons
        name={vehicle.icon}
        size={sizes.icon.lg}
        color={selected ? colors.textOnPrimary : colors.primary}
      />
    </View>
  );

  if (failed) {
    // Not selectable; the retry is a sibling so screen readers can reach it.
    return (
      <View style={styles.row} testID={`vehicle-${item.vehicleType}`}>
        {icon}
        <View
          style={styles.info}
          accessible
          accessibilityLabel={`${name}, ${t('booking.estimateError')}`}
        >
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="dangerText" numberOfLines={2}>
            {t('booking.estimateError')}
          </Text>
        </View>
        <IconButton
          icon="refresh"
          variant="soft"
          onPress={item.refetch}
          accessibilityLabel={`${t('common.actions.retry')}: ${name}`}
          testID={`vehicle-${item.vehicleType}-retry`}
        />
      </View>
    );
  }

  const a11y = view
    ? [
        name,
        seats,
        view.price,
        view.originalPrice ? t('booking.originalPrice', { price: view.originalPrice }) : null,
        t('booking.tripDuration', { duration: view.duration }),
      ]
    : [name, seats, t('common.labels.loading')];

  return (
    <PressableScale
      onPress={onSelect}
      disabled={!view}
      haptic={selected ? 'none' : 'selection'}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: !view, busy: item.isRefreshing }}
      accessibilityLabel={a11y.filter(Boolean).join(', ')}
      style={[styles.row, selected && styles.selected]}
      testID={`vehicle-${item.vehicleType}`}
    >
      {icon}
      <View style={styles.info}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={2}>
          {view ? `${seats} · ${view.duration}` : seats}
        </Text>
      </View>
      {view ? (
        <Animated.View
          entering={FadeIn.duration(motion.duration.normal)}
          style={[styles.price, item.isRefreshing && styles.refreshing]}
        >
          <Text variant="bodyStrong">{view.price}</Text>
          {view.originalPrice ? (
            <Text
              variant="caption"
              color={selected ? 'textSecondary' : 'textMuted'}
              style={styles.struck}
            >
              {view.originalPrice}
            </Text>
          ) : null}
        </Animated.View>
      ) : (
        <View style={styles.price}>
          <Skeleton width={sizes.skeleton.price} height={sizes.icon.md} />
        </View>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.touchTarget + t.spacing.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.lg,
    borderWidth: t.sizes.focusBorder,
    borderColor: t.colors.transparent,
  },
  selected: { borderColor: t.colors.primary, backgroundColor: t.colors.primarySoft },
  icon: {
    width: t.sizes.avatar.md,
    height: t.sizes.avatar.md,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  iconSelected: { backgroundColor: t.colors.primaryFillStrong },
  info: { flex: 1, gap: t.spacing.xxs },
  price: { alignItems: 'flex-end', flexShrink: 0 },
  refreshing: { opacity: t.motion.disabledOpacity },
  struck: { textDecorationLine: 'line-through' },
}));
