import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator } from 'react-native';
import Animated, { FadeOutUp, FadeInUp } from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

export interface ConnectionBannerProps {
  status: ConnectionStatus;
  /** Translated text for the current status (e.g. "Reconnecting…"). */
  message: string;
  testID?: string;
}

/** Slim banner shown while realtime/network is down. Renders nothing when connected. */
export function ConnectionBanner({ status, message, testID }: ConnectionBannerProps) {
  const styles = useStyles();
  const { colors, sizes, motion } = useTheme();
  if (status === 'connected') return null;

  const offline = status === 'offline';
  const fg = offline ? 'dangerText' : 'warningText';

  return (
    <Animated.View
      testID={testID}
      entering={FadeInUp.duration(motion.duration.normal)}
      exiting={FadeOutUp.duration(motion.duration.fast)}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.base, offline ? styles.offline : styles.connecting]}
    >
      {offline ? (
        <Ionicons name="cloud-offline-outline" size={sizes.icon.sm} color={colors[fg]} />
      ) : (
        <ActivityIndicator size="small" color={colors[fg]} />
      )}
      <Text variant="caption" color={fg} style={styles.text} numberOfLines={2}>
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
    borderRadius: t.radii.md,
  },
  connecting: { backgroundColor: t.colors.warningSoft },
  offline: { backgroundColor: t.colors.dangerSoft },
  text: { flex: 1, fontFamily: t.typography.bodyStrong.fontFamily },
}));
