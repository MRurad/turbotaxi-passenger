import { useChatStore } from '@/features/chat/store';
import type { ChatMessage, OutgoingMessage } from '@/features/chat/types';

const RIDE = 2;
const OTHER = 5;
const store = useChatStore.getState;

const local = (
  localId: string,
  text: string,
  createdAt = '2026-10-22T10:00:00Z',
  rideId = RIDE,
): OutgoingMessage => ({ localId, rideId, text, createdAt, status: 'pending' });
const mine = (id: number, text: string, sentAt = '2026-10-22T10:00:30Z'): ChatMessage => ({
  id,
  rideId: RIDE,
  senderRole: 'user',
  senderId: 7,
  text,
  sentAt,
  isMine: true,
});
const outgoing = (rideId = RIDE) => store().outgoing[rideId] ?? [];

beforeEach(() => {
  store().reset();
});

describe('chat store — outgoing status', () => {
  it('marks a pending message as failed', () => {
    store().addOutgoing(local('local-1', 'hi'));

    const changed = store().setOutgoingStatus(RIDE, 'local-1', 'failed');

    expect(changed).toBe(true);
    expect(outgoing()[0]?.status).toBe('failed');
  });

  it('refuses to retry a message that is already pending (double tap)', () => {
    store().addOutgoing(local('local-1', 'hi'));

    expect(store().setOutgoingStatus(RIDE, 'local-1', 'pending')).toBe(false);
  });

  it('refuses to change a message that is gone (already confirmed)', () => {
    expect(store().setOutgoingStatus(RIDE, 'local-404', 'failed')).toBe(false);
    expect(store().outgoing[RIDE]).toBeUndefined();
  });

  it('only touches the message it was asked about', () => {
    store().addOutgoing(local('local-1', 'a'));
    store().addOutgoing(local('local-2', 'b'));

    store().setOutgoingStatus(RIDE, 'local-2', 'failed');

    expect(outgoing().map((m) => m.status)).toEqual(['pending', 'failed']);
  });
});

describe('chat store — confirming', () => {
  it('records an alias from the server id to the local row', () => {
    store().addOutgoing(local('local-1', 'hi', '2026-10-22T10:00:00Z'));

    store().confirmOutgoing(RIDE, 'local-1', 50);

    expect(store().aliases[50]).toEqual({ key: 'local-1', at: '2026-10-22T10:00:00Z' });
  });

  it('confirming an unknown local message leaves the aliases untouched', () => {
    const before = store().aliases;

    store().confirmOutgoing(RIDE, 'local-404', 50);

    expect(store().aliases).toBe(before);
  });

  it('removeOutgoing drops only that message', () => {
    store().addOutgoing(local('local-1', 'a'));
    store().addOutgoing(local('local-2', 'b'));

    store().removeOutgoing(RIDE, 'local-1');

    expect(outgoing().map((m) => m.localId)).toEqual(['local-2']);
  });
});

describe('chat store — reconcileOutgoing', () => {
  it('matches one confirmed message to one local copy, even with the same text twice', () => {
    store().addOutgoing(local('local-1', 'ok', '2026-10-22T10:00:00Z'));
    store().addOutgoing(local('local-2', 'ok', '2026-10-22T10:00:10Z'));

    store().reconcileOutgoing(RIDE, [mine(50, 'ok')]);

    expect(outgoing().map((m) => m.localId)).toEqual(['local-2']);
    expect(store().aliases[50]?.key).toBe('local-1');
  });

  it('matches the server copy despite surrounding whitespace', () => {
    store().addOutgoing(local('local-1', 'ok'));

    store().reconcileOutgoing(RIDE, [mine(50, '  ok \n')]);

    expect(outgoing()).toEqual([]);
  });

  it('does not match a different text', () => {
    store().addOutgoing(local('local-1', 'ok'));

    store().reconcileOutgoing(RIDE, [mine(50, 'okay')]);

    expect(outgoing()).toHaveLength(1);
  });

  it('matches within two minutes either side, not beyond', () => {
    store().addOutgoing(local('local-1', 'ok', '2026-10-22T10:02:00Z'));
    store().addOutgoing(local('local-2', 'later', '2026-10-22T10:02:00Z'));

    store().reconcileOutgoing(RIDE, [
      mine(50, 'ok', '2026-10-22T10:00:00Z'), // exactly 2 min earlier: same message
      mine(51, 'later', '2026-10-22T10:04:01Z'), // 2 min 1 s later: a different message
    ]);

    expect(outgoing().map((m) => m.localId)).toEqual(['local-2']);
  });

  it('leaves other rides alone', () => {
    store().addOutgoing(local('local-1', 'ok', '2026-10-22T10:00:00Z', OTHER));

    store().reconcileOutgoing(RIDE, [mine(50, 'ok')]);

    expect(outgoing(OTHER)).toHaveLength(1);
  });

  it('does not touch state when nothing matches', () => {
    store().addOutgoing(local('local-1', 'ok'));
    const before = store().outgoing;

    store().reconcileOutgoing(RIDE, [mine(50, 'something else')]);

    expect(store().outgoing).toBe(before);
  });
});

describe('chat store — rides', () => {
  it('opening a chat clears only that ride’s unread count', () => {
    store().messageReceived(RIDE);
    store().messageReceived(OTHER);

    store().setOpenRide(RIDE);

    expect(store().unread).toEqual({ [RIDE]: 0, [OTHER]: 1 });
    expect(store().openRideId).toBe(RIDE);
  });

  it('a message for another ride still counts while one chat is open', () => {
    store().setOpenRide(RIDE);

    store().messageReceived(OTHER);

    expect(store().unread[OTHER]).toBe(1);
  });

  it('clearRide keeps the other rides’ unread counts and local messages', () => {
    store().addOutgoing(local('local-1', 'a', '2026-10-22T10:00:00Z', OTHER));
    store().messageReceived(OTHER);
    store().messageReceived(RIDE);

    store().clearRide(RIDE);

    expect(store().unread).toEqual({ [OTHER]: 1 });
    expect(outgoing(OTHER)).toHaveLength(1);
  });

  it('reset forgets everything (logout)', () => {
    store().addOutgoing(local('local-1', 'a'));
    store().setOpenRide(RIDE);
    store().confirmOutgoing(RIDE, 'local-1', 50);

    store().reset();

    expect(store()).toMatchObject({ openRideId: null, unread: {}, outgoing: {}, aliases: {} });
  });
});
