import type { InfiniteData } from '@tanstack/react-query';

import { getLanguage, type Language } from '@/i18n';
import { formatDay, parseApiDate } from '@/lib/format';
import type { Paged } from '@/types/paged';

import type { ChatListItem, ChatMessage, ConfirmedAlias, OutgoingMessage } from './types';

export type ChatPages = InfiniteData<Paged<ChatMessage>, number>;

const timeOf = (iso: string) => parseApiDate(iso)?.getTime() ?? 0;

/** Oldest first; same instant → by id (server order). */
export function compareMessages(a: ChatMessage, b: ChatMessage): number {
  return timeOf(a.sentAt) - timeOf(b.sentAt) || a.id - b.id;
}

/**
 * All loaded pages → one de-duplicated list, oldest first. Works whatever order the backend
 * pages in (newest-first or oldest-first page 1) and with live messages inserted in between.
 */
export function mergeMessagePages(pages: readonly Paged<ChatMessage>[]): ChatMessage[] {
  const byId = new Map<number, ChatMessage>();
  for (const page of pages) for (const message of page.items) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

/**
 * Put one message (from the hub or a send response) into the cached pages, unless a message
 * with that id is already there. Returns the same object when nothing changes.
 */
export function insertMessage(
  data: ChatPages | undefined,
  message: ChatMessage,
): ChatPages | undefined {
  if (!data) return data;
  const exists = data.pages.some((page) => page.items.some((item) => item.id === message.id));
  if (exists) return data;
  const [first, ...rest] = data.pages;
  if (!first) return data;
  return {
    ...data,
    pages: [
      // Order inside a page doesn't matter: the list is merged and sorted on read.
      { ...first, items: [...first.items, message] },
      ...rest,
    ],
  };
}

const dayKey = (iso: string) => {
  const date = parseApiDate(iso);
  return date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : '';
};

/**
 * Rows for an inverted FlatList (newest first): server messages and still-unconfirmed
 * outgoing ones in time order, with a day heading above each day's first message.
 */
export function buildChatItems(
  messages: readonly ChatMessage[],
  outgoing: readonly OutgoingMessage[],
  now: Date = new Date(),
  language: Language = getLanguage(),
  aliases: Readonly<Record<number, ConfirmedAlias>> = {},
): ChatListItem[] {
  type Entry = { at: string; item: ChatListItem };
  const takenKeys = new Set(
    messages.map((m) => aliases[m.id]?.key).filter((key): key is string => key !== undefined),
  );
  const entries: Entry[] = [
    ...messages.map((message) => {
      // A confirmed message of mine keeps its local row: same key, same place.
      const alias = aliases[message.id];
      return {
        at: alias?.at ?? message.sentAt,
        item: { kind: 'message', key: alias?.key ?? `m${message.id}`, message } as const,
      };
    }),
    ...outgoing
      .filter((message) => !takenKeys.has(message.localId))
      .map((message) => ({
        at: message.createdAt,
        item: { kind: 'outgoing', key: message.localId, message } as const,
      })),
  ].sort((a, b) => timeOf(a.at) - timeOf(b.at));

  const rows: ChatListItem[] = [];
  let currentDay = '';
  for (const { at, item } of entries) {
    const day = dayKey(at);
    if (day !== currentDay) {
      currentDay = day;
      rows.push({ kind: 'day', key: `d${day}`, label: formatDay(at, now, language) });
    }
    rows.push(item);
  }
  return rows.reverse();
}
