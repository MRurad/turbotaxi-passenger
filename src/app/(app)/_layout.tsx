import { Stack } from 'expo-router';
import { View } from 'react-native';

import { useRideChatConnection } from '@/features/chat/hooks/useRideChatConnection';
import { useRideEvents } from '@/features/ride/hooks/useRideEvents';
import { useRideRecovery } from '@/features/ride/hooks/useRideRecovery';
import { useRideRouteGuard } from '@/features/ride/hooks/useRideRouteGuard';
import { hasActiveRide } from '@/features/ride/store';
import { useRealtimeLifecycle } from '@/realtime/useRealtimeLifecycle';
import { makeStyles } from '@/theme';

// Only reachable when signed in (guarded by Stack.Protected in src/providers/RootStack.tsx).
export default function AppLayout() {
  const styles = useStyles();
  // During an active ride the hub stays connected in the background.
  useRealtimeLifecycle({ keepAliveInBackground: hasActiveRide });
  useRideRecovery();
  useRideEvents();
  useRideRouteGuard();
  useRideChatConnection();

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="search" options={{ presentation: 'modal' }} />
        {/* Phases are routed by useRideRouteGuard; no swipe-back out of a ride. */}
        <Stack.Screen name="ride/index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="ride/summary" options={{ gestureEnabled: false }} />
        <Stack.Screen name="chat/[rideId]" />
        <Stack.Screen name="profile/index" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="history/index" />
        <Stack.Screen name="history/[rideId]" />
        <Stack.Screen name="promos" />
        <Stack.Screen name="settings" />
      </Stack>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { flex: 1 },
}));
