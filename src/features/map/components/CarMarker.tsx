import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Easing, View } from 'react-native';
import { AnimatedRegion, MarkerAnimated } from 'react-native-maps';

import { CAR_MARKER_ANIMATION_MS } from '@/constants/timeouts';
import { bearingDegrees, distanceMeters } from '@/lib/geo';
import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

/** Ignore GPS jitter below this distance when computing a bearing. */
const MIN_BEARING_DISTANCE_M = 3;

export interface CarMarkerProps {
  coordinate: LatLng;
  /** Device heading from the driver app, if provided; otherwise derived from movement. */
  heading?: number | null;
  title?: string;
}

/**
 * Driver car that glides between location updates (~1 s) and rotates to the direction of
 * travel. Not used until live tracking (Prompt 9).
 */
export function CarMarker({ coordinate, heading, title }: CarMarkerProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const [region] = useState(
    () => new AnimatedRegion({ ...coordinate, latitudeDelta: 0, longitudeDelta: 0 }),
  );
  const previous = useRef<LatLng>(coordinate);
  const [rotation, setRotation] = useState(heading ?? 0);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const from = previous.current;
    if (heading == null && distanceMeters(from, coordinate) >= MIN_BEARING_DISTANCE_M) {
      setRotation(bearingDegrees(from, coordinate));
    } else if (heading != null) {
      setRotation(heading);
    }
    previous.current = coordinate;
    region.stopAnimation(() => undefined);
    region
      .timing({
        ...coordinate,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: CAR_MARKER_ANIMATION_MS,
        easing: Easing.linear,
        useNativeDriver: false,
        // Required by RN's TimingAnimationConfig type; AnimatedRegion sets the real per-axis
        // toValue from latitude/longitude internally.
        toValue: 0,
      })
      .start();
  }, [coordinate, heading, region]);

  return (
    <MarkerAnimated
      // react-native-maps types MarkerAnimated.coordinate as LatLng, but it is designed to take
      // an AnimatedRegion (documented usage); the cast bridges that typing gap.
      coordinate={region as unknown as LatLng}
      title={title}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={rotation}
      // Snapshot once rendered; the native marker handles position/rotation from here.
      tracksViewChanges={tracksViewChanges}
    >
      {/* Wait a frame after layout so the icon glyph is drawn before the snapshot. */}
      <View
        style={styles.car}
        onLayout={() => requestAnimationFrame(() => setTracksViewChanges(false))}
      >
        <Ionicons name="car-sport" size={sizes.icon.lg} color={colors.textOnPrimary} />
      </View>
    </MarkerAnimated>
  );
}

const useStyles = makeStyles((t) => ({
  car: {
    width: t.sizes.pin.head + t.spacing.sm,
    height: t.sizes.pin.head + t.spacing.sm,
    borderRadius: t.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primaryFillStrong,
    borderWidth: t.sizes.focusBorder * 2,
    borderColor: t.colors.surfaceElevated,
  },
}));
