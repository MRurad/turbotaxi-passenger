import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';

import { makeStyles, useTheme } from '@/theme';
import type { LatLng } from '@/types/geo';

export interface PlaceMarkerProps {
  coordinate: LatLng;
  kind: 'pickup' | 'destination';
  /** a11y / callout title (e.g. the address). */
  title?: string;
  /** Tap on the marker (e.g. change this point). */
  onPress?: () => void;
  /** Says what a tap does; required with onPress. */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Static pickup (steel blue dot) or destination (flag) marker. Kept small on purpose: Apple
 * Maps places large custom markers off their point (see TimeBubbleMarker for the time label).
 */
export function PlaceMarker({
  coordinate,
  kind,
  title,
  onPress,
  accessibilityLabel,
  testID,
}: PlaceMarkerProps) {
  const styles = useStyles();
  const { colors, sizes } = useTheme();
  const pickup = kind === 'pickup';

  return (
    <Marker
      coordinate={coordinate}
      title={title}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? title}
      anchor={{ x: 0.5, y: 0.5 }}
      // Static content: stop re-rendering the native snapshot after the first frame.
      tracksViewChanges={false}
      testID={testID}
    >
      <View style={[styles.base, pickup ? styles.pickup : styles.destination]}>
        {pickup ? (
          <View style={styles.dot} />
        ) : (
          <Ionicons name="flag" size={sizes.icon.sm} color={colors.textOnPrimary} />
        )}
      </View>
    </Marker>
  );
}

const useStyles = makeStyles((t) => ({
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
  dot: {
    width: t.sizes.pin.stemWidth * 3,
    height: t.sizes.pin.stemWidth * 3,
    borderRadius: t.sizes.pin.stemWidth * 3,
    backgroundColor: t.colors.textOnPrimary,
  },
}));
