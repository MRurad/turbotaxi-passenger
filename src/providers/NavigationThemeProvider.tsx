import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type PropsWithChildren } from 'react';

import { useTheme } from '@/theme';

/** Syncs react-navigation colors and the status bar with our theme. */
export function NavigationThemeProvider({ children }: PropsWithChildren) {
  const { isDark, colors } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surfaceElevated,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [isDark, colors]);

  return (
    <NavThemeProvider value={navTheme}>
      {children}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}
