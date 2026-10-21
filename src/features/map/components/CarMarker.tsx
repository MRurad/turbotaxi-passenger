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
 * Driver car seen from above: glides between location updates (~1 s) and points in the
 * direction of travel (flat marker, rotation 0 = north = the car's nose up). Dark car on
 * the light map, light car on the dark map — always apart from the route it drives on.
 */
export function CarMarker({ coordinate, heading, title }: CarMarkerProps) {
  const styles = useStyles();
  const { isDark, sizes } = useTheme();
  const [region] = useState(
    () => new AnimatedRegion({ ...coordinate, latitudeDelta: 0, longitudeDelta: 0 }),
  );
  const previous = useRef<LatLng>(coordinate);
  const [rotation, setRotation] = useState(heading ?? 0);
  // The native marker is a snapshot of the view: retake it once per color scheme.
  const [snapshotScheme, setSnapshotScheme] = useState<boolean | null>(null);

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
      zIndex={sizes.car.zIndex}
      tracksViewChanges={snapshotScheme !== isDark}
    >
      {/* Re-mounts on a scheme switch so onLayout fires again; wait a frame so the car is
          drawn before the snapshot. The padded frame keeps the shadow inside the snapshot. */}
      <View
        key={isDark ? 'dark' : 'light'}
        style={styles.frame}
        onLayout={() => {
          const scheme = isDark;
          requestAnimationFrame(() => setSnapshotScheme(scheme));
        }}
      >
        <View style={styles.car}>
          <View style={styles.windshield} />
          <View style={styles.rearWindow} />
        </View>
      </View>
    </MarkerAnimated>
  );
}

const useStyles = makeStyles((t) => {
  const glassWidth = t.sizes.car.width - t.sizes.car.glassInset * 2;
  return {
    frame: { padding: t.spacing.xs },
    car: {
      width: t.sizes.car.width,
      height: t.sizes.car.height,
      borderRadius: t.sizes.car.radius,
      alignItems: 'center',
      justifyContent: 'space-between',
      // Bonnet in front (top = direction of travel), short boot behind.
      paddingTop: t.sizes.car.hood,
      paddingBottom: t.sizes.car.trunk,
      backgroundColor: t.colors.mapCar,
      borderWidth: t.sizes.car.outline,
      borderColor: t.colors.mapCarOutline,
      ...t.shadows.sm,
    },
    windshield: {
      width: glassWidth,
      height: t.sizes.car.windshield,
      borderRadius: t.sizes.car.glassRadius,
      backgroundColor: t.colors.mapCarGlass,
    },
    rearWindow: {
      width: glassWidth,
      height: t.sizes.car.rearWindow,
      borderRadius: t.sizes.car.glassRadius,
      backgroundColor: t.colors.mapCarGlass,
    },
  };
});
