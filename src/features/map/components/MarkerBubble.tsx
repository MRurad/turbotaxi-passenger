import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

/** The bubble must stay inside its small marker box (see sizes.timeBubble). */
const BUBBLE_MAX_FONT_SCALE = 1.2;

export interface MarkerBubbleProps {
  /** Highlighted part, e.g. "18 min" or "Driver in 4 min". */
  title: string;
  /** Arrival clock time, e.g. "12:45" (shown with a clock icon). */
  time?: string;
}

/** Compact callout: a filled chip, an optional clock time, and a pointer at the bottom. */
export function MarkerBubble({ title, time }: MarkerBubbleProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <View style={styles.chip}>
          <Text
            variant="caption"
            color="textOnPrimary"
            style={styles.strong}
            numberOfLines={1}
            maxFontSizeMultiplier={BUBBLE_MAX_FONT_SCALE}
          >
            {title}
          </Text>
        </View>
        {time ? (
          <View style={styles.time}>
            <Ionicons name="time-outline" size={sizes.icon.xs} color={colors.textSecondary} />
            <Text
              variant="caption"
              style={styles.strong}
              numberOfLines={1}
              maxFontSizeMultiplier={BUBBLE_MAX_FONT_SCALE}
            >
              {time}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.pointer, !time && styles.pointerOnChip]} />
    </View>
  );
}

const POINTER = 10;

const useStyles = makeStyles((t) => ({
  wrap: { maxWidth: '100%', alignItems: 'center' },
  bubble: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: t.radii.pill,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  chip: {
    flexShrink: 1,
    justifyContent: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    backgroundColor: t.colors.primaryFill,
  },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xxs,
    paddingLeft: t.spacing.xs,
    paddingRight: t.spacing.sm,
  },
  strong: { fontFamily: t.typography.bodyStrong.fontFamily },
  // A rotated square tucked under the bubble's edge: a small arrow pointing at the marker.
  pointer: {
    width: POINTER,
    height: POINTER,
    marginTop: -POINTER / 2 - t.sizes.border,
    transform: [{ rotate: '45deg' }],
    backgroundColor: t.colors.surfaceElevated,
    borderRightWidth: t.sizes.border,
    borderBottomWidth: t.sizes.border,
    borderColor: t.colors.border,
  },
  pointerOnChip: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.primaryFill },
}));
