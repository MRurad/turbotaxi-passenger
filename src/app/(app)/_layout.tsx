import { Stack } from 'expo-router';
import { View } from 'react-native';

import { useRealtimeLifecycle } from '@/realtime/useRealtimeLifecycle';
import { makeStyles } from '@/theme';

// Only reachable when signed in (guarded by Stack.Protected in src/providers/RootStack.tsx).
export default function AppLayout() {
  const styles = useStyles();
  // TODO(Prompt 9): keepAliveInBackground from the ride store (active ride → stay connected).
  useRealtimeLifecycle();

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1 },
}));
