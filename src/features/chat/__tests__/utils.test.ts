import type { ChatMessage, OutgoingMessage } from '@/features/chat/types';
import {
  buildChatItems,
  insertMessage,
  mergeMessagePages,
  type ChatPages,
} from '@/features/chat/utils';
import { i18n } from '@/i18n';
import type { Paged } from '@/types/paged';

const msg = (id: number, sentAt: string, isMine = false): ChatMessage => ({
  id,
  rideId: 2,
  senderRole: isMine ? 'User' : 'Driver',
  senderId: isMine ? 7 : 4,
  text: `m${id}`,
  sentAt,
  isMine,
});
const page = (items: ChatMessage[], pageNumber = 1): Paged<ChatMessage> => ({
  items,
  pageNumber,
  pageSize: 30,
  totalCount: items.length,
  totalPages: 2,
  hasNextPage: pageNumber < 2,
});
const pages = (...list: Paged<ChatMessage>[]): ChatPages => ({
  pages: list,
  pageParams: list.map((p) => p.pageNumber),
});
const outgoing = (localId: string, createdAt: string): OutgoingMessage => ({
  localId,
  rideId: 2,
  text: 'hi',
  createdAt,
  status: 'pending',
});

beforeAll(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('mergeMessagePages', () => {
  it('de-duplicates by id and sorts oldest first, whatever the page order', () => {
    const newestFirst = [
      page([msg(3, '2026-10-22T10:03:00Z'), msg(2, '2026-10-22T10:02:00Z')], 1),
      page([msg(2, '2026-10-22T10:02:00Z'), msg(1, '2026-10-22T10:01:00Z')], 2),
    ];
    expect(mergeMessagePages(newestFirst).map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it('reads backend timestamps without a zone as UTC', () => {
    const merged = mergeMessagePages([
      page([msg(2, '2026-10-22T10:02:00'), msg(1, '2026-10-22T10:01:00Z')]),
    ]);
    expect(merged.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe('insertMessage', () => {
  it('adds a new message once; the same id again changes nothing', () => {
    const data = pages(page([msg(1, '2026-10-22T10:01:00Z')]));
    const once = insertMessage(data, msg(2, '2026-10-22T10:02:00Z'));
    expect(once?.pages[0]?.items.map((m) => m.id)).toEqual([1, 2]);
    expect(insertMessage(once, msg(2, '2026-10-22T10:02:00Z'))).toBe(once);
  });

  it('leaves an unloaded chat alone (it is fetched when opened)', () => {
    expect(insertMessage(undefined, msg(1, '2026-10-22T10:01:00Z'))).toBeUndefined();
  });
});

describe('buildChatItems', () => {
  const NOW = new Date('2026-10-22T12:00:00Z');

  it('newest first for the inverted list, with outgoing messages in time order', () => {
    const items = buildChatItems(
      [msg(1, '2026-10-22T10:01:00Z'), msg(2, '2026-10-22T10:05:00Z', true)],
      [outgoing('local-1', '2026-10-22T10:03:00Z')],
      NOW,
    );
    expect(items.map((i) => i.key)).toEqual(['m2', 'local-1', 'm1', expect.stringMatching(/^d/)]);
  });

  it('puts a day heading above each day', () => {
    const items = buildChatItems(
      [msg(1, '2026-10-21T10:00:00Z'), msg(2, '2026-10-22T10:00:00Z')],
      [],
      NOW,
    );
    const labels = items
      .filter((i) => i.kind === 'day')
      .map((i) => (i.kind === 'day' ? i.label : ''));
    expect(labels).toEqual(['Today', 'Yesterday']);
  });
});
