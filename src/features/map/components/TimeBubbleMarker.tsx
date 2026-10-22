import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { MARKER_SNAPSHOT_MS } from '@/constants/timeouts';
import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

import { IS_GOOGLE_MAP } from '../constants';
import { MarkerBubble, type MarkerBubbleProps } from './MarkerBubble';

export interface TimeBubbleMarkerProps extends MarkerBubbleProps {
  /** The place marker's point; the bubble's pointer stops just above that marker. */
  coordinate: LatLng;
  onPress?: () => void;
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Time bubble floating above a PlaceMarker. A small box (fixed height, as wide as the bubble,
 * sizes.timeBubble), bubble at its bottom, lifted by half its height + the marker's radius + a gap: Apple Maps
 * centres the view (centerOffset), Google uses the anchor (below the box's bottom edge).
 */
export function TimeBubbleMarker({
  coordinate,
  title,
  time,
  onPress,
  accessibilityLabel,
  testID,
}: TimeBubbleMarkerProps) {
  const styles = useStyles();
  const { isDark, sizes } = useTheme();
  const { height, gap } = sizes.timeBubble;
  const lift = sizes.pin.head / 2 + gap;
  // Google snapshots custom markers: track view changes until new content has drawn.
  const content = `${title}|${time ?? ''}|${isDark}`;
  const [snapshotted, setSnapshotted] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSnapshotted(content), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 1 + lift / height }}
      centerOffset={IS_GOOGLE_MAP ? undefined : { x: 0, y: -(height / 2 + lift) }}
      tracksViewChanges={snapshotted !== content}
      onPress={onPress}
      zIndex={1}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View style={styles.box}>
        <MarkerBubble title={title} time={time} />
      </View>
    </Marker>
  );
}

const useStyles = makeStyles((t) => ({
  // Exactly as wide as the bubble (no empty sides): Apple Maps centres a custom marker by a
  // width that doesn't match wide views, so centring inside a wider box drifts right.
  box: {
    maxWidth: t.sizes.timeBubble.width,
    height: t.sizes.timeBubble.height,
    justifyContent: 'flex-end',
  },
}));
