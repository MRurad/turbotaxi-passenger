import { useEffect, useState } from 'react';

import { restoreLanguage } from './index';

/** True once the saved language preference has been applied (keeps the splash up until then). */
export function useLanguageReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    restoreLanguage().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
