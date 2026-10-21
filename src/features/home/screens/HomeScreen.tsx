import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomPanel, IconButton } from '@/components/ui';
import { useBookingDraft } from '@/features/booking/store';
import { AppMap, type AppMapHandle } from '@/features/map/components/AppMap';
import { CenterPin } from '@/features/map/components/CenterPin';
import { PlaceMarker } from '@/features/map/components/PlaceMarker';
import { BAKU_REGION } from '@/features/map/constants';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { makeStyles, useTheme } from '@/theme';

import { HomeSheetContent } from '../components/HomeSheetContent';
import { HomeTopBar } from '../components/HomeTopBar';
import { LocationPermissionCard } from '../components/LocationPermissionCard';
import { PinDestinationContent } from '../components/PinDestinationContent';
import { useHomeMap } from '../hooks/useHomeMap';
import { useRecentPlaces } from '../recentPlaces';

export function HomeScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { spacing, sizes } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<AppMapHandle>(null);
  const [view, setView] = useState({ width: 0, height: 0 });
  const [sheetHeight, setSheetHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(0);
  const pickup = useBookingDraft((s) => s.pickup);
  const destination = useBookingDraft((s) => s.destination);
  const hydrateRecents = useRecentPlaces((s) => s.hydrate);

  const location = useCurrentLocation();
  const showCard = location.status === 'denied' || location.status === 'unavailable';

  // The pin lives between the top overlays (permission card) and the sheet.
  const cardTop = insets.top + sizes.mapControl + spacing.md;
  const overlayTop = showCard && cardHeight > 0 ? cardTop + cardHeight : 0;
  const overlays = useMemo(
    () => ({ top: overlayTop, bottom: sheetHeight, left: 0, right: 0 }),
    [overlayTop, sheetHeight],
  );
  const framePadding = useMemo(
    () => ({
      top: Math.max(overlayTop, cardTop) + spacing.xl,
      bottom: sheetHeight + spacing.xl,
      left: spacing.xxl,
      right: spacing.xxl,
    }),
    [overlayTop, cardTop, sheetHeight, spacing],
  );
  const pinPoint = useMemo(
    () =>
      view.height ? { x: view.width / 2, y: (overlayTop + view.height - sheetHeight) / 2 } : null,
    [view, overlayTop, sheetHeight],
  );

  const map = useHomeMap(mapRef, location, { pinPoint, framePadding });
  const choosingDestination = map.pinTarget === 'destination';
  const pinIsActive = choosingDestination || !destination;

  useEffect(() => {
    hydrateRecents().catch(() => undefined);
  }, [hydrateRecents]);

  const onLayout = (e: LayoutChangeEvent) =>
    setView({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });

  return (
    <View style={styles.root} onLayout={onLayout} testID="home-screen">
      <View style={styles.fill} onTouchStart={map.onTouchStart}>
        <AppMap
          ref={mapRef}
          initialRegion={BAKU_REGION}
          overlayInsets={overlays}
          viewHeight={view.height}
          showsUserLocation={location.status === 'granted'}
          onRegionChange={map.onRegionChange}
          onRegionChangeComplete={map.onRegionChangeComplete}
          testID="home-map"
        >
          {/* The pickup gets its own marker whenever the center pin isn't choosing it. */}
          {pickup && (!pinIsActive || choosingDestination) ? (
            <PlaceMarker coordinate={pickup.location} kind="pickup" />
          ) : null}
          {destination && !choosingDestination ? (
            <PlaceMarker coordinate={destination.location} kind="destination" />
          ) : null}
        </AppMap>
      </View>

      {pinIsActive ? (
        <View
          style={[styles.pinArea, { top: overlayTop, bottom: sheetHeight }]}
          pointerEvents="none"
        >
          <CenterPin
            lifted={map.dragging}
            variant={choosingDestination ? 'destination' : 'pickup'}
          />
        </View>
      ) : null}

      <HomeTopBar />

      {showCard ? (
        <View style={[styles.card, { top: cardTop }]}>
          <LocationPermissionCard location={location} onHeightChange={setCardHeight} />
        </View>
      ) : null}

      <View style={[styles.myLocation, { bottom: sheetHeight + spacing.lg }]}>
        <IconButton
          icon="locate"
          variant="surface"
          size="lg"
          onPress={map.goToMyLocation}
          accessibilityLabel={t('home.myLocation')}
          testID="home-my-location"
        />
      </View>

      <BottomPanel onHeightChange={setSheetHeight} testID="home-sheet">
        {choosingDestination ? (
          <PinDestinationContent pinnedPlace={map.pinnedPlace} loading={map.pinLoading} />
        ) : (
          <HomeSheetContent pinLoading={map.pinLoading} />
        )}
      </BottomPanel>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  pinArea: { position: 'absolute', left: 0, right: 0 },
  card: { position: 'absolute', left: t.spacing.lg, right: t.spacing.lg },
  myLocation: { position: 'absolute', right: t.spacing.lg },
}));
