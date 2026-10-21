import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';
import type { Place } from '@/types/place';

export interface RouteSummaryProps {
  pickup: Place | null;
  destination: Place;
  onEditPickup: () => void;
  onEditDestination: () => void;
}

type Kind = 'pickup' | 'destination';

/** Pickup → destination; each whole line is a button that opens search to change it. */
export function RouteSummary({
  pickup,
  destination,
  onEditPickup,
  onEditDestination,
}: RouteSummaryProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, sizes } = useTheme();
  const unnamed = t('home.pickupUnknown');

  const line = (kind: Kind, place: Place | null, onEdit: () => void) => {
    const label = kind === 'pickup' ? t('common.labels.pickup') : t('common.labels.destination');
    const action = kind === 'pickup' ? t('booking.editPickup') : t('booking.editDestination');
    const title = place?.title || unnamed;
    return (
      <PressableScale
        onPress={onEdit}
        haptic="light"
        scaleDisabled
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${title}`}
        accessibilityHint={action}
        style={({ pressed }) => [styles.line, pressed && styles.pressed]}
        testID={`route-edit-${kind}`}
      >
        <Ionicons
          name={kind === 'pickup' ? 'radio-button-on' : 'flag'}
          size={sizes.icon.sm}
          color={kind === 'pickup' ? colors.primary : colors.danger}
        />
        <Text variant="body" numberOfLines={1} style={styles.text}>
          {title}
        </Text>
        <Ionicons name="create-outline" size={sizes.icon.md} color={colors.textMuted} />
      </PressableScale>
    );
  };

  return (
    <View style={styles.card}>
      {line('pickup', pickup, onEditPickup)}
      <View style={styles.divider} />
      {line('destination', destination, onEditDestination)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: t.sizes.touchTarget,
    paddingHorizontal: t.spacing.md,
  },
  pressed: { backgroundColor: t.colors.pressedOverlay },
  text: { flex: 1 },
  divider: {
    height: t.sizes.border,
    marginLeft: t.spacing.md * 2 + t.sizes.icon.sm,
    backgroundColor: t.colors.border,
  },
}));
