import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { formatTime } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

import { BUBBLE_MAX_WIDTH } from '../constants';

export interface MessageBubbleProps {
  text: string;
  /** ISO UTC. */
  sentAt: string;
  mine: boolean;
  /** Who wrote it (screen reader label for the driver's messages). */
  senderName: string;
  /** Only for the passenger's not-yet-confirmed messages. */
  status?: 'pending' | 'failed';
  /** Local id of a failed message (passed back to onRetry). */
  localId?: string;
  onRetry?: (localId: string) => void;
}

/** Chat bubble: mine on the right in steel blue, the driver's on the left on a surface. */
export const MessageBubble = memo(function MessageBubble({
  text,
  sentAt,
  mine,
  senderName,
  status,
  localId,
  onRetry,
}: MessageBubbleProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes } = useTheme();
  const time = formatTime(sentAt, language);
  const failed = status === 'failed';
  const label = mine
    ? t('chat.a11y.mine', { time, text })
    : t('chat.a11y.theirs', { name: senderName, time, text });

  const bubble = (
    <View style={[styles.bubble, mine ? styles.mine : styles.theirs, failed && styles.failed]}>
      <Text variant="body" color={mine ? 'textOnPrimary' : 'textPrimary'} selectable={!status}>
        {text}
      </Text>
      <View style={styles.meta}>
        <Text variant="caption" color={mine ? 'textOnPrimary' : 'textMuted'}>
          {time}
        </Text>
        {status === 'pending' ? (
          <Ionicons name="time-outline" size={sizes.icon.xs} color={colors.textOnPrimary} />
        ) : null}
      </View>
    </View>
  );

  if (failed) {
    return (
      <View style={[styles.row, styles.rowMine]}>
        <PressableScale
          onPress={() => localId && onRetry?.(localId)}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={t('chat.a11y.withStatus', {
            message: label,
            status: t('chat.failed'),
          })}
          accessibilityHint={t('chat.retryHint')}
          style={styles.failedWrap}
        >
          {bubble}
          <View style={styles.failedHint}>
            <Ionicons name="alert-circle" size={sizes.icon.sm} color={colors.danger} />
            <Text variant="caption" color="dangerText">
              {t('chat.failed')}
            </Text>
          </View>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View
        accessible
        accessibilityLabel={
          status === 'pending'
            ? t('chat.a11y.withStatus', { message: label, status: t('chat.sending') })
            : label
        }
        style={styles.bubbleWrap}
      >
        {bubble}
      </View>
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', paddingVertical: t.spacing.xxs },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubbleWrap: { maxWidth: BUBBLE_MAX_WIDTH },
  bubble: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radii.lg,
    gap: t.spacing.xxs,
  },
  // Filled steel (AA with white text); the corner nearest the sender is squared off.
  mine: {
    backgroundColor: t.colors.primaryFillStrong,
    borderBottomRightRadius: t.sizes.chatTailRadius,
  },
  theirs: {
    backgroundColor: t.colors.surface,
    borderBottomLeftRadius: t.sizes.chatTailRadius,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
  },
  // Failed: a danger edge instead of fading (keeps the text readable).
  failed: { borderWidth: t.sizes.focusBorder, borderColor: t.colors.danger },
  meta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: t.spacing.xxs },
  failedWrap: { maxWidth: BUBBLE_MAX_WIDTH, alignItems: 'flex-end', gap: t.spacing.xxs },
  failedHint: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xxs },
}));
