import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { MARKER_SNAPSHOT_MS } from '@/constants/timeouts';
import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

import { useMarkerCentering } from '../hooks/useMarkerCentering';
import { MarkerBubble, type MarkerBubbleProps } from './MarkerBubble';

export interface PlaceMarkerProps {
  coordinate: LatLng;
  kind: 'pickup' | 'destination';
  /** a11y / callout title (e.g. the address). */
  title?: string;
  /** Time bubble above the marker ("10 min · Arrive at 15:01"). */
  label?: MarkerBubbleProps | null;
  /** Tap on the marker (e.g. change this point). */
  onPress?: () => void;
  /** Says what a tap does; required with onPress. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Pickup (steel blue dot) or destination (flag) marker, optionally with a time bubble above it.
 * Bubble and dot are ONE marker view, laid out symmetrically (bubble area, dot, an equal empty
 * area): the view's centre is the dot, so the default centring puts the dot on the point and
 * the pointer straight above it. (Two separate markers drift apart on iOS: MapKit positions
 * each custom view by its own size, which changes as the text does.) On Apple Maps the whole
 * marker is also measured and nudged onto its coordinate (useMarkerCentering).
 */
export function PlaceMarker({
  coordinate,
  kind,
  title,
  label,
  onPress,
  accessibilityLabel,
  testID,
}: PlaceMarkerProps) {
  const styles = useStyles();
  const { colors, sizes, isDark } = useTheme();
  const pickup = kind === 'pickup';
  const { ref: centeringRef, offset, onLayout } = useMarkerCentering(coordinate);
  // Google snapshots custom markers: track view changes until new content has drawn.
  const content = `${label?.title ?? ''}|${label?.subtitle ?? ''}|${isDark}`;
  const [snapshotted, setSnapshotted] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSnapshotted(content), MARKER_SNAPSHOT_MS);
    return () => clearTimeout(timer);
  }, [content]);

  const dot = (
    <View style={[styles.base, pickup ? styles.pickup : styles.destination]}>
      {pickup ? (
        <View style={styles.dot} />
      ) : (
        <Ionicons
          name="flag"
          size={sizes.icon.sm}
          color={colors.textOnPrimary}
          style={styles.flag}
        />
      )}
    </View>
  );

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      onPress={onPress}
      accessibilityLabel={
        accessibilityLabel ??
        ([label?.title, label?.subtitle, title].filter(Boolean).join(', ') || undefined)
      }
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={offset}
      tracksViewChanges={snapshotted !== content}
      zIndex={label ? 1 : 0}
      testID={testID}
    >
      {/* The measured root: its centre is the dot (useMarkerCentering keeps it on the point). */}
      <View ref={centeringRef} collapsable={false} onLayout={onLayout}>
        {label ? (
          <View style={styles.labelled}>
            <View style={styles.bubbleArea}>
              <MarkerBubble {...label} />
            </View>
            {dot}
            {/* Mirrors the bubble area so the dot is the exact centre of the view. */}
            <View style={styles.mirror} />
          </View>
        ) : (
          dot
        )}
      </View>
    </Marker>
  );
}

const useStyles = makeStyles((t) => ({
  labelled: { width: t.sizes.markerLabel.width, alignItems: 'center' },
  // Fixed height (room for larger text); the bubble sits at its bottom, just above the dot.
  bubbleArea: {
    width: '100%',
    height: t.sizes.markerLabel.height,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: t.spacing.xs,
    paddingBottom: t.spacing.xs,
  },
  mirror: { height: t.sizes.markerLabel.height },
  base: {
    width: t.sizes.pin.head,
    height: t.sizes.pin.head,
    borderRadius: t.sizes.pin.head / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: t.sizes.focusBorder * 2,
    borderColor: t.colors.surfaceElevated,
  },
  pickup: { backgroundColor: t.colors.primaryFill },
  destination: { backgroundColor: t.colors.danger },
  // The glyph's pole sits left of its box: nudge it so the flag reads as centered.
  flag: { marginLeft: t.spacing.xxs },
  dot: {
    width: t.sizes.pin.stemWidth * 3,
    height: t.sizes.pin.stemWidth * 3,
    borderRadius: t.sizes.pin.stemWidth * 3,
    backgroundColor: t.colors.textOnPrimary,
  },
}));
