import { Stack } from 'expo-router';

import { useAuthStore } from '@/features/auth/store';
import { useTheme } from '@/theme';

/**
 * Root navigator. Stack.Protected does the auth redirects: signed out → (auth)/welcome,
 * signed in → (app). Rendered only after hydrate (SplashGate), so status is never 'loading'.
 */
export function RootStack() {
  const { colors } = useTheme();
  const signedIn = useAuthStore((s) => s.status === 'authenticated');

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev/ui-kit" />
      </Stack.Protected>
    </Stack>
  );
}
