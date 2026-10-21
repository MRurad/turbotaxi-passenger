import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';
import Animated, { FadeOutUp, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme, type ColorToken } from '@/theme';

import { Text } from './Text';
import type { IconName } from './types';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastViewProps {
  message: string;
  tone: ToastTone;
  onDismiss: () => void;
}

const TONE: Record<ToastTone, { icon: IconName; color: ColorToken }> = {
  info: { icon: 'information-circle', color: 'primary' },
  success: { icon: 'checkmark-circle', color: 'success' },
  warning: { icon: 'warning', color: 'warning' },
  danger: { icon: 'alert-circle', color: 'danger' },
};

export function ToastView({ message, tone, onDismiss }: ToastViewProps) {
  const styles = useStyles();
  const { colors, sizes, motion, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { icon, color } = TONE[tone];

  return (
    <Animated.View
      entering={FadeInUp.duration(motion.duration.normal)}
      exiting={FadeOutUp.duration(motion.duration.fast)}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={message}
        style={styles.toast}
        testID="toast"
      >
        <Ionicons name={icon} size={sizes.icon.lg} color={colors[color]} />
        <Text variant="bodyStrong" style={styles.message} numberOfLines={3}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    position: 'absolute',
    left: t.spacing.lg,
    right: t.spacing.lg,
    zIndex: t.sizes.zIndexToast,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    minHeight: t.sizes.touchTarget + t.spacing.md,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    ...t.shadows.lg,
  },
  message: { flex: 1 },
}));
