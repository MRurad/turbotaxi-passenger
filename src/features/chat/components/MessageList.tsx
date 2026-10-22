import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useChangeLanguage } from '@/i18n/useChangeLanguage';
import { makeStyles, useTheme } from '@/theme';

import { LOAD_MORE_THRESHOLD, SKELETON_BUBBLES } from '../constants';
import { useChatMessages } from '../hooks/useChatMessages';
import { useChatStore } from '../store';
import type { ChatListItem, OutgoingMessage } from '../types';
import { buildChatItems } from '../utils';
import { DaySeparator } from './DaySeparator';
import { MessageBubble } from './MessageBubble';

const NO_OUTGOING: readonly OutgoingMessage[] = [];

export interface MessageListProps {
  rideId: number;
  /** The driver's name for screen-reader labels. */
  driverName: string;
  onRetry: (localId: string) => void;
}

/** Inverted list (newest at the bottom); scrolling up loads older pages. */
export function MessageList({ rideId, driverName, onRetry }: MessageListProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { language } = useChangeLanguage();
  const { colors, sizes } = useTheme();
  const chat = useChatMessages(rideId);
  const outgoing = useChatStore((s) => s.outgoing[rideId] ?? NO_OUTGOING);
  const aliases = useChatStore((s) => s.aliases);
  // Day labels ("Today"…) are localized, so a language switch rebuilds them.
  const items = useMemo(
    () => buildChatItems(chat.messages, outgoing, undefined, language, aliases),
    [chat.messages, outgoing, language, aliases],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatListItem }) => {
      if (item.kind === 'day') return <DaySeparator label={item.label} />;
      if (item.kind === 'message') {
        return (
          <MessageBubble
            text={item.message.text}
            sentAt={item.message.sentAt}
            mine={item.message.isMine}
            senderName={driverName}
          />
        );
      }
      return (
        <MessageBubble
          text={item.message.text}
          sentAt={item.message.createdAt}
          mine
          senderName={driverName}
          status={item.message.status}
          localId={item.message.localId}
          onRetry={onRetry}
        />
      );
    },
    [driverName, onRetry],
  );

  if (chat.isLoading) {
    return (
      <View
        style={styles.skeleton}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.labels.loading')}
      >
        {Array.from({ length: SKELETON_BUBBLES.count }, (_, i) => (
          <Skeleton
            key={i}
            width={SKELETON_BUBBLES.width}
            height={sizes.touchTarget}
            radius="lg"
            style={i % 2 ? styles.right : null}
          />
        ))}
      </View>
    );
  }
  if (chat.error && items.length === 0) {
    return (
      <ErrorState
        title={t('chat.loadError')}
        message={t(chat.error.messageKey)}
        retryLabel={t('common.actions.retry')}
        onRetry={chat.refetch}
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon="chatbubbles-outline"
        title={t('chat.empty')}
        message={t('chat.emptyHint')}
      />
    );
  }

  // Inverted: the "footer" is at the top, where older messages load.
  const top = chat.isLoadingMore ? (
    <ActivityIndicator color={colors.primary} style={styles.more} />
  ) : chat.error ? (
    <Button
      label={t('chat.loadOlderFailed')}
      variant="ghost"
      size="sm"
      leftIcon="refresh"
      onPress={chat.refetch}
    />
  ) : null;

  return (
    <FlatList
      inverted
      data={items}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      onEndReached={chat.loadMore}
      onEndReachedThreshold={LOAD_MORE_THRESHOLD}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ListFooterComponent={top}
      testID="chat-messages"
    />
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingVertical: t.spacing.md },
  more: { paddingVertical: t.spacing.md },
  skeleton: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: t.spacing.md,
    paddingVertical: t.spacing.lg,
  },
  right: { alignSelf: 'flex-end' },
}));
