import { useEffect } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { triggerHaptic } from '@/lib/haptics';
import { makeStyles, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Red confirm button + warning haptic (cancel ride, log out…). */
  destructive?: boolean;
  /** Shows a spinner on the confirm button while the action runs. */
  loading?: boolean;
  testID?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
  testID,
}: ConfirmDialogProps) {
  const styles = useStyles();
  const { motion } = useTheme();

  const handleCancel = () => {
    if (!loading) onCancel();
  };

  useEffect(() => {
    if (visible && destructive) triggerHaptic('warning');
  }, [visible, destructive]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
      testID={testID}
    >
      <Animated.View style={styles.backdrop}>
        {/* Decorative tap-outside area; the Cancel button is the accessible dismiss. */}
        <Pressable
          style={styles.fill}
          onPress={handleCancel}
          accessible={false}
          importantForAccessibility="no"
        />
        <Animated.View
          entering={ZoomIn.duration(motion.duration.normal)}
          style={styles.card}
          accessibilityViewIsModal
          accessibilityRole="alert"
        >
          <View style={styles.text}>
            <Text variant="heading" align="center">
              {title}
            </Text>
            {message ? (
              <Text variant="body" color="textSecondary" align="center">
                {message}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              haptic={destructive ? 'medium' : 'light'}
              loading={loading}
              fullWidth
              testID={testID && `${testID}-confirm`}
            />
            <Button
              label={cancelLabel}
              onPress={handleCancel}
              variant={destructive ? 'secondary' : 'ghost'}
              disabled={loading}
              fullWidth
              testID={testID && `${testID}-cancel`}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: t.spacing.xl,
    backgroundColor: t.colors.overlay,
  },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  card: {
    width: '100%',
    maxWidth: t.sizes.dialogMaxWidth,
    padding: t.spacing.xl,
    gap: t.spacing.xl,
    borderRadius: t.radii.xl,
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.isDark ? t.sizes.border : 0,
    borderColor: t.colors.border,
    ...t.shadows.lg,
  },
  text: { gap: t.spacing.sm },
  actions: { gap: t.spacing.xs },
}));
