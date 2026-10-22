import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
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
  /** Extra room between the pointer and the marker (e.g. the taller-looking flag). */
  lifted?: boolean;
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
  lifted = false,
  accessibilityLabel,
  testID,
}: MarkerLabelProps) {
  const styles = useStyles();
  const { isDark, sizes } = useTheme();
  // Google snapshots custom markers: track view changes until new content has drawn, then
  // stop (no remount, so the bubble doesn't blink when the arrival minute changes).
  const content = `${title}|${subtitle ?? ''}|${isDark}`;
  const [snapshotted, setSnapshotted] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSnapshotted(content), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <Marker
      coordinate={coordinate}
      // The box's bottom centre sits on the point. Android/Google: anchor. Apple Maps ignores
      // anchor and centres the view, so it is lifted by half the (fixed) height.
      anchor={{ x: 0.5, y: 1 }}
      centerOffset={Platform.OS === 'ios' ? { x: 0, y: -sizes.markerLabel.height / 2 } : undefined}
      tracksViewChanges={snapshotted !== content}
      onPress={onPress}
      zIndex={1}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      testID={testID}
    >
      <View style={[styles.box, lifted && styles.lifted]} pointerEvents="box-none">
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
  // Fixed box, bubble + pointer stacked at its bottom centre; below, the pointer tip stops just
  // above the marker. The empty top leaves room for larger text sizes and the shadow.
  box: {
    width: t.sizes.markerLabel.width,
    height: t.sizes.markerLabel.height,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: t.spacing.xs,
    paddingBottom: t.sizes.pin.head / 2 + t.spacing.xxs,
  },
  lifted: { paddingBottom: t.sizes.pin.head / 2 + t.spacing.sm },
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
