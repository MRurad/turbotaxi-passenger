import { Stack } from 'expo-router';

// Only reachable when signed in (guarded by Stack.Protected in src/providers/RootStack.tsx).
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
