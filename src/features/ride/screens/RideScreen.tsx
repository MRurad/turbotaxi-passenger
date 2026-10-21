import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RealtimeBanner } from '@/components/RealtimeBanner';
import { useBackToWhereTo } from '@/features/booking/hooks/useBackToWhereTo';
import { AppMap, type AppMapHandle } from '@/features/map/components/AppMap';
import { BAKU_REGION, USER_ZOOM_DELTA } from '@/features/map/constants';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { useMapOverlayLayout } from '@/features/map/hooks/useMapOverlayLayout';
import { makeStyles, useTheme } from '@/theme';

import { RideMapLayers } from '../components/RideMapLayers';
import { RidePanel } from '../components/RidePanel';
import { SearchPulse } from '../components/SearchPulse';
import { useRideCamera } from '../hooks/useRideCamera';
import { useRideStore } from '../store';

/**
 * The active ride over the map: searching (pulse on the pickup), driver on the way / arrived,
 * the trip, no-driver and cancelled. Which one is shown is decided by the ride store; the
 * route guard brings the user here.
 */
export function RideScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  const mapRef = useRef<AppMapHandle>(null);
  const layout = useMapOverlayLayout({ overlayTop: 0, frameTop: insets.top + spacing.lg });
  const location = useCurrentLocation();
  const phase = useRideStore((s) => s.phase);
  // Start on the pickup instead of flying in from Baku's center.
  const [initialRegion] = useState(() => {
    const pickup = useRideStore.getState().pickup?.location;
    return pickup
      ? { ...pickup, latitudeDelta: USER_ZOOM_DELTA, longitudeDelta: USER_ZOOM_DELTA }
      : BAKU_REGION;
  });
  // While searching the camera holds the pickup under the pulse.
  const searching = phase === 'searching';

  useRideCamera(mapRef, layout.framePadding, layout.view.height > 0);
  // Android back: leaves a finished ride (cancelled / no driver); during a ride it does
  // nothing (the guard would bounce back anyway) — Cancel is the way out.
  useBackToWhereTo(() => {
    const store = useRideStore.getState();
    if (store.phase === 'cancelled' || store.phase === 'no_driver') store.reset();
  });

  return (
    <View style={styles.root} onLayout={layout.onLayout} testID="ride-screen">
      <View style={styles.fill}>
        <AppMap
          ref={mapRef}
          initialRegion={initialRegion}
          overlayInsets={layout.overlays}
          viewWidth={layout.view.width}
          viewHeight={layout.view.height}
          showsUserLocation={location.status === 'granted'}
          scrollEnabled={!searching}
          zoomEnabled={!searching}
          rotateEnabled={false}
          pitchEnabled={false}
          testID="ride-map"
        >
          <RideMapLayers />
        </AppMap>
      </View>
      {searching && layout.pinPoint ? <SearchPulse point={layout.pinPoint} /> : null}
      <RealtimeBanner />
      <RidePanel onHeightChange={layout.setSheetHeight} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
}));
