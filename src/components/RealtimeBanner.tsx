import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectionBanner } from '@/components/ui';
import { useDebouncedHubStatus, type HubBannerStatus } from '@/realtime/useDebouncedHubStatus';
import { userHub } from '@/realtime/userHub';
import { makeStyles } from '@/theme';

/**
 * Floating "Reconnecting…" / "Connection lost" banner for map screens (Home, live ride), placed
 * beside the top-left floating control. Debounced (no flashes on short drops), never blocks
 * touches, and announced once per change for screen readers.
 */
export function RealtimeBanner() {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const status = useDebouncedHubStatus(userHub);
  const announced = useRef<HubBannerStatus>('hidden');

  const message =
    status === 'reconnecting' ? t('common.connection.connecting') : t('common.connection.lost');

  // Mounting views aren't reliably read out; announce transitions explicitly (once each).
  useEffect(() => {
    if (status !== 'hidden' && status !== announced.current) {
      AccessibilityInfo.announceForAccessibility(message);
    }
    announced.current = status;
  }, [status, message]);

  return (
    <View
      style={[styles.wrap, { top: insets.top + styles.wrap.top }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      testID="realtime-banner"
    >
      <ConnectionBanner
        floating
        status={
          status === 'reconnecting' ? 'connecting' : status === 'lost' ? 'offline' : 'connected'
        }
        message={message}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Vertically centered on the floating avatar (same top + height), to its right.
  wrap: {
    position: 'absolute',
    top: t.spacing.sm,
    left: t.sizes.mapControl + t.spacing.lg * 2,
    right: t.spacing.lg,
    minHeight: t.sizes.mapControl,
    justifyContent: 'center',
    zIndex: t.sizes.zIndexToast - 1,
  },
}));
