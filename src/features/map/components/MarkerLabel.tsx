import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { Text } from '@/components/ui';
import { MARKER_SNAPSHOT_MS } from '@/constants/timeouts';
import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

export interface MarkerLabelProps {
  coordinate: LatLng;
  /** Bold line, e.g. "18 min" or "Driver in 4 min". */
  title: string;
  /** Second line, e.g. "Arrive at 12:45". */
  subtitle?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A small card floating just above a place marker (same coordinate). Its transparent bottom
 * padding clears the marker, so the card never covers the point itself.
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
  // Google snapshots custom markers: track view changes until new content has drawn, then
  // stop (no remount, so the card doesn't blink when the arrival minute changes).
  const content = `${title}|${subtitle ?? ''}|${isDark}`;
  const [snapshotted, setSnapshotted] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSnapshotted(content), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={snapshotted !== content}
      onPress={onPress}
      zIndex={1}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
      testID={testID}
    >
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text variant="caption" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Marker>
  );
}

const useStyles = makeStyles((t) => ({
  // Half the marker + a gap below the card: the label sits above the dot / flag.
  // Side/top padding leaves the shadow room inside the marker's bounds.
  wrap: {
    paddingBottom: t.sizes.pin.head / 2 + t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
    paddingTop: t.spacing.xs,
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radii.sm,
    backgroundColor: t.colors.surfaceElevated,
    // Always bordered: on a near-white map the shadow alone barely shows.
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    ...t.shadows.sm,
  },
  title: { fontFamily: t.typography.bodyStrong.fontFamily },
}));
