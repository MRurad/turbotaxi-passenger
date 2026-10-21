import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * Google Places billing session: one token for all autocomplete calls + the details call of a
 * single search. Rotate it after a place is picked.
 */
export function usePlacesSessionToken(): { token: string; rotate: () => void } {
  const [token, setToken] = useState(() => uuidv4());
  const rotate = useCallback(() => setToken(uuidv4()), []);
  return { token, rotate };
}
