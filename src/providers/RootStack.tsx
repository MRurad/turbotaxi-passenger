import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** Root navigator: headerless, with the themed background behind every screen. */
export function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    />
  );
}
