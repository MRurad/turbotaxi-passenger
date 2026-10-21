import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import type { RealtimeDebugScreen as RealtimeDebugScreenType } from '@/features/dev/screens/RealtimeDebugScreen';

type DevScreenModule = { RealtimeDebugScreen: typeof RealtimeDebugScreenType };

// Dev-only inspector (realtime events + HTTP log). Required only in dev, so the screen, the
// network log and their imports are stripped from release bundles.
let DevScreen: typeof RealtimeDebugScreenType | null = null;
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devModule = require('@/features/dev/screens/RealtimeDebugScreen') as DevScreenModule;
  DevScreen = devModule.RealtimeDebugScreen;
}

export default function RealtimeDebugRoute() {
  if (!DevScreen) return <Redirect href={ROUTES.home} />;
  return <DevScreen />;
}
