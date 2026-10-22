import { useEffect, useState } from 'react';

/** Date.now(), refreshed every `intervalMs` (clock-based labels such as an arrival time). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
