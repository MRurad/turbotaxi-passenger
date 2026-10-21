import { useEffect, useRef } from 'react';

/** Runs `callback` once after `delayMs`; pass null to cancel. */
export function useTimeout(callback: () => void, delayMs: number | null): void {
  const saved = useRef(callback);

  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delayMs === null) return;
    const id = setTimeout(() => saved.current(), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);
}
