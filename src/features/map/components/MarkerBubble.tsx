import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface MarkerBubbleProps {
  /** Highlighted part, e.g. "18 min" or "Driver in 4 min". */
  title: string;
  /** Second part, e.g. "Arrive at 12:45". */
  subtitle?: string;
}

/** Callout bubble (filled time chip + optional arrival part) with a pointer at the bottom. */
export function MarkerBubble({ title, subtitle }: MarkerBubbleProps) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <View style={styles.bubble}>
        <View style={styles.chip}>
          <Text variant="caption" color="textOnPrimary" style={styles.strong} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text variant="caption" style={[styles.strong, styles.subtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.pointer, !subtitle && styles.pointerOnChip]} />
    </View>
  );
}

const POINTER = 12;

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
    ...t.shadows.md,
  },
  chip: {
    justifyContent: 'center',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    backgroundColor: t.colors.primaryFill,
  },
  subtitle: {
    flexShrink: 1,
    alignSelf: 'center',
    paddingLeft: t.spacing.sm,
    paddingRight: t.spacing.md,
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
