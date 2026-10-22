import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConnectionBanner } from '@/components/ui/ConnectionBanner';
import { useIsOnline } from '@/lib/network';
import { makeStyles } from '@/theme';

export interface OfflineBannerProps {
  /**
   * inline: a strip in the layout (under a screen header, see Screen); floating: over a map,
   * beside the top-left avatar (Home, Ride).
   */
  variant?: 'inline' | 'floating';
}

/** "You're offline" while there is no network (announced once by OfflineAnnouncer). */
export function OfflineBanner({ variant = 'inline' }: OfflineBannerProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();

  if (online) return null;
  const banner = (
    <ConnectionBanner
      floating={variant === 'floating'}
      status="offline"
      message={t('common.connection.offline')}
    />
  );
  return variant === 'floating' ? (
    <View
      style={[styles.floating, { top: insets.top + styles.floating.top }]}
      pointerEvents="none"
      testID="offline-banner"
    >
      {banner}
    </View>
  ) : (
    <View style={styles.inline} testID="offline-banner">
      {banner}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Same place as the realtime banner (which steps aside while offline).
  floating: {
    position: 'absolute',
    top: t.spacing.sm,
    left: t.sizes.mapControl + t.spacing.lg * 2,
    right: t.spacing.lg,
    minHeight: t.sizes.mapControl,
    justifyContent: 'center',
    zIndex: t.sizes.zIndexToast - 1,
  },
  inline: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.sm },
}));
