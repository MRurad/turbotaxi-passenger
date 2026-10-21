import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';
import type { Theme } from './types';

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** Mode control for settings / dev toggles. */
export function useThemeMode(): Omit<ThemeContextValue, 'theme'> & { isDark: boolean } {
  const { theme, mode, setMode, isReady } = useThemeContext();
  return { mode, setMode, isReady, isDark: theme.isDark };
}
