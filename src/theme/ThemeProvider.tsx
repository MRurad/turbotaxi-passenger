import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { STORAGE_KEYS } from '@/constants/storageKeys';

import { themes } from './createTheme';
import { isThemeMode, type Theme, type ThemeMode } from './types';

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** False until the persisted mode has been read (keep the splash screen up until then). */
  isReady: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  /** Overrides the stored mode (tests / previews). */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode }: PropsWithChildren<ThemeProviderProps>) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode ?? 'system');
  const [isReady, setIsReady] = useState(initialMode !== undefined);
  // A choice made before the stored value loads must win over the stored value.
  const userChanged = useRef(false);

  useEffect(() => {
    if (initialMode !== undefined) return;
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEYS.themeMode)
      .then((stored) => {
        if (!cancelled && !userChanged.current && isThemeMode(stored)) setModeState(stored);
      })
      .catch(() => {
        // Unreadable preference → fall back to system mode.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialMode]);

  const setMode = useCallback((next: ThemeMode) => {
    userChanged.current = true;
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEYS.themeMode, next).catch(() => {
      // Non-critical: the choice still applies for this session.
    });
  }, []);

  // Native UI (keyboard, alerts, pickers) follows a manual mode too.
  useEffect(() => {
    if (isReady) Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode, isReady]);

  const scheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: themes[scheme], mode, setMode, isReady }),
    [scheme, mode, setMode, isReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
