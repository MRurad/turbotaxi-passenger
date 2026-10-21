// Must be first: polyfills crypto.getRandomValues for `uuid`.
import 'react-native-get-random-values';
// Validates env vars at startup; throws a readable error if .env is incomplete.
import '@/constants/config';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

// Theme, i18n and query providers are added in later prompts (src/providers/AppProviders.tsx).
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
