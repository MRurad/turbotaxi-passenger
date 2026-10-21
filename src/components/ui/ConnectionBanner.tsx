import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

/** Big Dynamic Type would push a 2-line banner over content below it. */
const BANNER_MAX_FONT_SCALE = 1.3;

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  /** Translated text for the current status (e.g. "Reconnecting…"). */
  message: string;
  /** Over a map: adds a shadow (light) / border (dark) so it separates from the tiles. */
  floating?: boolean;
  testID?: string;
}

/**
 * Slim banner shown while realtime/network is down. Renders nothing when connected.
 * Announcements are the caller's job (it mounts fresh, so a live region here isn't reliable).
 */
export function ConnectionBanner({
  status,
  message,
  floating = false,
  testID,
}: ConnectionBannerProps) {
  const styles = useStyles();
  const { colors, sizes, motion } = useTheme();
  if (status === 'connected') return null;

  const offline = status === 'offline';
  const fg = offline ? 'dangerText' : 'warningText';

  return (
    <Animated.View
      testID={testID}
      entering={FadeInDown.duration(motion.duration.normal)}
      exiting={FadeOutUp.duration(motion.duration.fast)}
      layout={LinearTransition}
      style={[
        styles.base,
        offline ? styles.offline : styles.connecting,
        floating && styles.floating,
      ]}
    >
      {offline ? (
        <Ionicons name="cloud-offline-outline" size={sizes.icon.sm} color={colors[fg]} />
      ) : (
        <ActivityIndicator size="small" color={colors[fg]} />
      )}
      <Text
        variant="caption"
        color={fg}
        style={styles.text}
        numberOfLines={2}
        maxFontSizeMultiplier={BANNER_MAX_FONT_SCALE}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.lg,
  },
  connecting: { backgroundColor: t.colors.warningSoft },
  offline: { backgroundColor: t.colors.dangerSoft },
  floating: t.isDark
    ? { borderWidth: t.sizes.border, borderColor: t.colors.border }
    : { ...t.shadows.sm },
  text: { flex: 1, fontFamily: t.typography.bodyStrong.fontFamily },
}));
