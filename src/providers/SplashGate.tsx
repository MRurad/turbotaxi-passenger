import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { useLanguageReady } from '@/i18n/useLanguageReady';
import { useThemeMode } from '@/theme';

interface SplashGateProps {
  /** Fonts finished loading (or failed — we then fall back to the system font). */
  fontsReady: boolean;
}

/** Keeps the native splash up until fonts, the saved theme mode and the saved language are ready. */
export function SplashGate({ fontsReady, children }: PropsWithChildren<SplashGateProps>) {
  const { isReady: themeReady } = useThemeMode();
  const languageReady = useLanguageReady();
  const ready = fontsReady && themeReady && languageReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return ready ? children : null;
}
