import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui';
import { MAX_FONT_SCALE, makeStyles, useTheme } from '@/theme';

import { CHAT_MAX_LENGTH } from '../constants';

/** Message field + send button. Clears after sending; send is disabled while empty. */
export function ChatInputBar({ onSend }: { onSend: (text: string) => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('chat.placeholder')}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        multiline
        maxLength={CHAT_MAX_LENGTH}
        style={styles.input}
        accessibilityLabel={t('chat.placeholder')}
        testID="chat-input"
      />
      <IconButton
        icon="send"
        variant="filled"
        onPress={send}
        disabled={!canSend}
        haptic="light"
        accessibilityLabel={t('chat.send')}
        testID="chat-send"
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm },
  input: {
    flex: 1,
    minHeight: t.sizes.touchTarget,
    maxHeight: t.sizes.chatInputMaxHeight,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
    borderRadius: t.radii.xl,
    backgroundColor: t.colors.surface,
    borderWidth: t.sizes.border,
    borderColor: t.colors.border,
    color: t.colors.textPrimary,
    ...t.typography.body,
  },
}));
