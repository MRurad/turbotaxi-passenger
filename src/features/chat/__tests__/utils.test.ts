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

describe('confirming a message without flicker', () => {
  const NOW = new Date('2026-10-22T12:00:00Z');
  const local = outgoing('local-7', '2026-10-22T10:03:00Z');
  // Server clock a bit later than the phone's: without the alias the bubble would move.
  const confirmed = msg(70, '2026-10-22T10:06:00Z', true);
  const driver = msg(1, '2026-10-22T10:04:00Z');
  const alias = { 70: { key: 'local-7', at: local.createdAt } };

  it('the confirmed copy keeps the local row key and place', () => {
    const before = buildChatItems([driver], [local], NOW).map((i) => i.key);
    const after = buildChatItems([driver, confirmed], [], NOW, 'en', alias).map((i) => i.key);
    expect(after).toEqual(before); // [driver m1, local-7, day] — same keys, same order
  });

  it('never shows both copies while the local one is still in the store', () => {
    const keys = buildChatItems([driver, confirmed], [local], NOW, 'en', alias).map((i) => i.key);
    expect(keys.filter((k) => k === 'local-7')).toHaveLength(1);
    expect(keys).not.toContain('m70');
  });
});

describe('compareMessages', () => {
  it('orders messages sent at the same instant by id (server order)', () => {
    const merged = mergeMessagePages([
      page([msg(9, '2026-10-22T10:00:00Z'), msg(4, '2026-10-22T10:00:00Z')]),
    ]);

    expect(merged.map((m) => m.id)).toEqual([4, 9]);
  });

  it('puts a message with an unreadable timestamp first instead of crashing', () => {
    const merged = mergeMessagePages([
      page([msg(1, '2026-10-22T10:00:00Z'), msg(2, 'not a date')]),
    ]);

    expect(merged.map((m) => m.id)).toEqual([2, 1]);
  });
});

describe('insertMessage edge cases', () => {
  it('returns the same object when the cache has no pages', () => {
    const empty = pages();

    expect(insertMessage(empty, msg(1, '2026-10-22T10:01:00Z'))).toBe(empty);
  });

  it('does not add a message already present on an older page', () => {
    const data = pages(
      page([msg(2, '2026-10-22T10:02:00Z')], 1),
      page([msg(1, '2026-10-22T10:01:00Z')], 2),
    );

    expect(insertMessage(data, msg(1, '2026-10-22T10:01:00Z'))).toBe(data);
  });
});

describe('buildChatItems edge cases', () => {
  it('returns no rows (not even a day heading) for an empty chat', () => {
    expect(buildChatItems([], [], new Date('2026-10-22T12:00:00Z'))).toEqual([]);
  });

  it('shows a failed outgoing message as its own row', () => {
    const failed: OutgoingMessage = {
      ...outgoing('local-9', '2026-10-22T10:00:00Z'),
      status: 'failed',
    };

    const items = buildChatItems([], [failed], new Date('2026-10-22T12:00:00Z'), 'en');

    expect(items[0]).toMatchObject({
      kind: 'outgoing',
      key: 'local-9',
      message: { status: 'failed' },
    });
  });
});
