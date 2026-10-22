import { useEffect, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui';
import { MARKER_SNAPSHOT_MS } from '@/constants/timeouts';
import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

export interface MarkerLabelProps {
  coordinate: LatLng;
  /** Highlighted part, e.g. "18 min" or "Driver in 4 min". */
  title: string;
  /** Second part, e.g. "Arrive at 12:45". */
  subtitle?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Callout bubble above a place marker (same coordinate): a filled time chip, an optional
 * arrival part, and a pointer down to the marker. The marker itself stays visible below.
 */
export function MarkerLabel({
  coordinate,
  title,
  subtitle,
  onPress,
  accessibilityLabel,
  testID,
}: MarkerLabelProps) {
  const styles = useStyles();
  const { isDark } = useTheme();
  const [height, setHeight] = useState(0);
  // Google snapshots custom markers: track view changes until new content has drawn, then
  // stop (no remount, so the bubble doesn't blink when the arrival minute changes).
  const content = `${title}|${subtitle ?? ''}|${isDark}|${height}`;
  const [snapshotted, setSnapshotted] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSnapshotted(content), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <Marker
      coordinate={coordinate}
      // Android/Google: bottom edge on the point. Apple Maps ignores anchor and centers the
      // view, so it is lifted by half its measured height instead.
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={Platform.OS === 'ios' ? { x: 0, y: -height / 2 } : undefined}
      tracksViewChanges={snapshotted !== content}
      onPress={onPress}
      zIndex={1}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      testID={testID}
    >
      <View
        style={[styles.wrap, height === 0 && styles.measuring]}
        onLayout={(e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height))}
      >
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
    </Marker>
  );
}

const POINTER = 12;

const useStyles = makeStyles((t) => ({
  // Room for the shadow on the sides/top; below, the pointer tip stops just above the marker.
  wrap: {
    alignItems: 'center',
    paddingHorizontal: t.spacing.xs,
    paddingTop: t.spacing.xs,
    paddingBottom: t.sizes.pin.head / 2 + t.spacing.xxs,
  },
  // Not yet lifted into place (first layout on iOS): don't flash it over the marker.
  measuring: { opacity: 0 },
  bubble: {
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
