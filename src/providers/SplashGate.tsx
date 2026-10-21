import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { useAuthHydration } from '@/features/auth/hooks/useAuthHydration';
import { useLanguageReady } from '@/i18n/useLanguageReady';
import { useThemeMode } from '@/theme';

interface SplashGateProps {
  /** Fonts finished loading (or failed — we then fall back to the system font). */
  fontsReady: boolean;
}

/**
 * Keeps the (branded) native splash up until fonts, theme mode, language and the saved
 * session are restored, so the first screen is already the right one (welcome vs home).
 */
export function SplashGate({ fontsReady, children }: PropsWithChildren<SplashGateProps>) {
  const { isReady: themeReady } = useThemeMode();
  const languageReady = useLanguageReady();
  const authReady = useAuthHydration();
  const ready = fontsReady && themeReady && languageReady && authReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return ready ? children : null;
}
