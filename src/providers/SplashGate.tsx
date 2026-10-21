import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type PropsWithChildren } from 'react';

import { useThemeMode } from '@/theme';

interface SplashGateProps {
  /** Fonts finished loading (or failed — we then fall back to the system font). */
  fontsReady: boolean;
}

/** Keeps the native splash up until fonts and the persisted theme mode are ready. */
export function SplashGate({ fontsReady, children }: PropsWithChildren<SplashGateProps>) {
  const { isReady: themeReady } = useThemeMode();
  const ready = fontsReady && themeReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return ready ? children : null;
}
