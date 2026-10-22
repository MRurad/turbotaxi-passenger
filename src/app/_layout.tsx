// Must be first: polyfills crypto.getRandomValues for `uuid`.
import 'react-native-get-random-values';
// Validates env vars at startup; throws a readable error if .env is incomplete.
import '@/constants/config';
// Initializes i18next synchronously with bundled resources.
import '@/i18n';

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProviders } from '@/providers/AppProviders';
import { RootStack } from '@/providers/RootStack';
import { SplashGate } from '@/providers/SplashGate';
import { INTER_FONTS } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // On font error we still render (system font fallback) rather than hang on the splash.
  const [fontsLoaded, fontError] = useFonts(INTER_FONTS);

  return (
    <AppProviders>
      <SplashGate fontsReady={fontsLoaded || fontError !== null}>
        {/* Inside the gate: hydration isn't re-run by Restart, and the crash screen shows. */}
        <ErrorBoundary>
          <RootStack />
        </ErrorBoundary>
      </SplashGate>
    </AppProviders>
  );
}
