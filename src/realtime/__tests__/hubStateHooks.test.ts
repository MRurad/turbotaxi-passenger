import { act, renderHook } from '@testing-library/react-native';

import { BANNER_MIN_VISIBLE_MS, BANNER_SHOW_DELAY_MS } from '@/constants/timeouts';
import type { HubConnectionManager, HubState } from '@/realtime/HubConnectionManager';
import { useDebouncedHubStatus } from '@/realtime/useDebouncedHubStatus';
import { useHubState } from '@/realtime/useHubState';

/** Just the part of a hub the hooks read: current state + change notifications. */
function fakeHub(initial: HubState = 'connected') {
  let state = initial;
  const listeners = new Set<(s: HubState) => void>();
  const hub = {
    getState: () => state,
    subscribe: (listener: (s: HubState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as HubConnectionManager<Record<string, unknown>>;
  const setState = (next: HubState) => {
    state = next;
    listeners.forEach((listener) => listener(next));
  };
  return { hub, setState, listenerCount: () => listeners.size };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('useHubState', () => {
  it('returns the current hub state', async () => {
    const { hub } = fakeHub('connecting');

    const { result } = await renderHook(() => useHubState(hub));

    expect(result.current).toBe('connecting');
  });

  it('re-renders when the hub state changes', async () => {
    const { hub, setState } = fakeHub('connected');
    const { result } = await renderHook(() => useHubState(hub));

    await act(async () => setState('reconnecting'));

    expect(result.current).toBe('reconnecting');
  });

  it('unsubscribes from the hub on unmount', async () => {
    const { hub, listenerCount } = fakeHub();
    const { unmount } = await renderHook(() => useHubState(hub));
    expect(listenerCount()).toBe(1);

    await unmount();

    expect(listenerCount()).toBe(0);
  });
});

describe('useDebouncedHubStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  async function setup(initial: HubState = 'connected') {
    const fake = fakeHub(initial);
    const rendered = await renderHook(() => useDebouncedHubStatus(fake.hub));
    const advance = (ms: number) => act(async () => jest.advanceTimersByTime(ms));
    return { ...fake, ...rendered, advance };
  }

  it('stays hidden while connected, idle or connecting', async () => {
    const { result, setState, advance } = await setup('connected');

    await act(async () => setState('idle'));
    await advance(BANNER_SHOW_DELAY_MS * 2);
    await act(async () => setState('connecting'));
    await advance(BANNER_SHOW_DELAY_MS * 2);

    expect(result.current).toBe('hidden');
  });

  it('ignores a drop that recovers within the show delay', async () => {
    const { result, setState, advance } = await setup();

    await act(async () => setState('reconnecting'));
    await advance(BANNER_SHOW_DELAY_MS - 1);
    await act(async () => setState('connected'));
    await advance(BANNER_SHOW_DELAY_MS * 2);

    expect(result.current).toBe('hidden');
  });

  it('shows "reconnecting" once a drop lasts the show delay', async () => {
    const { result, setState, advance } = await setup();

    await act(async () => setState('reconnecting'));
    await advance(BANNER_SHOW_DELAY_MS - 1);
    expect(result.current).toBe('hidden');
    await advance(1);

    expect(result.current).toBe('reconnecting');
  });

  it('shows "lost" for a disconnected hub after the show delay', async () => {
    const { result, setState, advance } = await setup();

    await act(async () => setState('disconnected'));
    await advance(BANNER_SHOW_DELAY_MS);

    expect(result.current).toBe('lost');
  });

  it('switches from "reconnecting" to "lost" without another delay', async () => {
    const { result, setState, advance } = await setup();
    await act(async () => setState('reconnecting'));
    await advance(BANNER_SHOW_DELAY_MS);

    await act(async () => setState('disconnected'));
    await advance(0);

    expect(result.current).toBe('lost');
  });

  it('keeps a just-shown banner up for the minimum visible time after recovery', async () => {
    const { result, setState, advance } = await setup();
    await act(async () => setState('reconnecting'));
    await advance(BANNER_SHOW_DELAY_MS);

    await act(async () => setState('connected'));
    await advance(BANNER_MIN_VISIBLE_MS - 1);
    expect(result.current).toBe('reconnecting');
    await advance(1);

    expect(result.current).toBe('hidden');
  });

  it('hides a banner at once on recovery when it has been visible long enough', async () => {
    const { result, setState, advance } = await setup();
    await act(async () => setState('reconnecting'));
    await advance(BANNER_SHOW_DELAY_MS);
    await advance(BANNER_MIN_VISIBLE_MS);

    await act(async () => setState('connected'));
    await advance(0);

    expect(result.current).toBe('hidden');
  });
});
