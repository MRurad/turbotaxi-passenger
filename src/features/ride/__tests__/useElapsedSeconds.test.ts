import { act, renderHook } from '@testing-library/react-native';

import { useElapsedSeconds } from '@/features/ride/hooks/useElapsedSeconds';

const NOW = 1_800_000_000_000;

beforeEach(() => jest.useFakeTimers({ now: NOW }));
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useElapsedSeconds', () => {
  it('is 0 without a start time', async () => {
    const { result } = await renderHook(() => useElapsedSeconds(null));

    expect(result.current).toBe(0);
  });

  it('counts whole seconds since the start time', async () => {
    const { result } = await renderHook(() => useElapsedSeconds(NOW - 4_500));

    expect(result.current).toBe(4);
  });

  it('ticks every second', async () => {
    const { result } = await renderHook(() => useElapsedSeconds(NOW));

    await act(() => jest.advanceTimersByTime(3_000));

    expect(result.current).toBe(3);
  });

  it('never goes negative for a start time in the future (clock skew)', async () => {
    const { result } = await renderHook(() => useElapsedSeconds(NOW + 10_000));

    expect(result.current).toBe(0);
  });

  it('does not start a ticker without a start time', async () => {
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');

    await renderHook(() => useElapsedSeconds(null));

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('stops its ticker on unmount', async () => {
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = await renderHook(() => useElapsedSeconds(NOW));
    const timer = setIntervalSpy.mock.results[0]?.value;

    await unmount();

    expect(timer).toBeDefined();
    expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
  });

  it('restarts from a new start time (search restarted after a driver dropped out)', async () => {
    const { result, rerender } = await renderHook(
      ({ since }: { since: number | null }) => useElapsedSeconds(since),
      { initialProps: { since: NOW - 60_000 } },
    );
    expect(result.current).toBe(60);

    await act(() => jest.advanceTimersByTime(2_000));
    await rerender({ since: NOW + 2_000 });

    expect(result.current).toBe(0);
  });
});
