import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Linking, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Text } from '@/components/ui';
import type { CurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { makeStyles, useTheme } from '@/theme';

export interface LocationPermissionCardProps {
  location: CurrentLocation;
  /** Reports the card height so the map area (and the pin) can sit below it. */
  onHeightChange: (height: number) => void;
}

/**
 * Compact notice over the map when we can't use the user's location (map falls back to Baku).
 * Action: ask again if the OS allows it, else open Settings; retry if location services failed.
 */
export function LocationPermissionCard({ location, onHeightChange }: LocationPermissionCardProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, sizes, motion } = useTheme();
  const unavailable = location.status === 'unavailable';

  const action = unavailable
    ? { label: t('common.actions.retry'), run: location.refresh }
    : location.canAskAgain
      ? { label: t('permissions.location.allow'), run: location.request }
      : { label: t('permissions.location.openSettings'), run: () => Linking.openSettings() };

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.duration.normal)}
      onLayout={(e: LayoutChangeEvent) => onHeightChange(e.nativeEvent.layout.height)}
      style={styles.card}
      testID="location-permission-card"
    >
      <View style={styles.icon}>
        <Ionicons name="location-outline" size={sizes.icon.md} color={colors.primary} />
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={3} style={styles.text}>
        {unavailable ? t('permissions.location.unavailable') : t('permissions.location.denied')}
      </Text>
      <Button
        label={action.label}
        variant="ghost"
        onPress={() => {
          Promise.resolve(action.run()).catch(() => undefined);
        }}
        style={styles.action}
        testID="location-permission-action"
      />
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingLeft: t.spacing.md,
    paddingRight: t.spacing.xs,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.isDark ? t.sizes.border : 0,
    borderColor: t.colors.border,
    ...t.shadows.md,
  },
  icon: {
    width: t.sizes.icon.xl,
    height: t.sizes.icon.xl,
    borderRadius: t.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  text: { flex: 1 },
  action: { paddingHorizontal: t.spacing.md },
}));
