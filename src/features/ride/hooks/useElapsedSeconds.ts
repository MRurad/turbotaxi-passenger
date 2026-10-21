import { useEffect, useState } from 'react';

import { ELAPSED_TICK_MS } from '@/constants/timeouts';

/** Seconds since `since` (epoch ms), re-rendering every second; 0 when null. */
export function useElapsedSeconds(since: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (since === null) return;
    const timer = setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => clearInterval(timer);
  }, [since]);

  return since === null ? 0 : Math.max(0, Math.floor((now - since) / ELAPSED_TICK_MS));
}
