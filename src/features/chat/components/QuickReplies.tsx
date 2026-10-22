import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import type { TranslationKey } from '@/i18n/types';
import { makeStyles } from '@/theme';

const QUICK_REPLY_KEYS: readonly TranslationKey[] = [
  'chat.quickReplies.coming',
  'chat.quickReplies.here',
  'chat.quickReplies.wait',
];

/** One-tap messages ("I'm coming", "I'm here", "Please wait 2 minutes"), in the app language. */
export function QuickReplies({ onPick }: { onPick: (text: string) => void }) {
  const styles = useStyles();
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityLabel={t('chat.quickRepliesLabel')}
    >
      {QUICK_REPLY_KEYS.map((key) => (
        <Chip key={key} label={t(key)} onPress={() => onPick(t(key))} testID={`quick-${key}`} />
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  // Bleed into the footer's side padding so chips scroll to the screen edge.
  scroller: { marginHorizontal: -t.spacing.xl },
  row: { gap: t.spacing.sm, paddingVertical: t.spacing.xs, paddingHorizontal: t.spacing.xl },
}));
