import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { RealtimeDebugScreen } from '@/features/dev/screens/RealtimeDebugScreen';

// Temporary dev-only route: SignalR inspector for discovering the real event names.
export default function RealtimeDebugRoute() {
  if (!__DEV__) return <Redirect href={ROUTES.home} />;
  return <RealtimeDebugScreen />;
}
