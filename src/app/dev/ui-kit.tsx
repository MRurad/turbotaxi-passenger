import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import type { UiKitScreen as UiKitScreenType } from '@/features/dev/screens/UiKitScreen';

type DevScreenModule = { UiKitScreen: typeof UiKitScreenType };

// Dev-only design-system showcase. Required only in dev, so it's stripped from release bundles.
let DevScreen: typeof UiKitScreenType | null = null;
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const devModule = require('@/features/dev/screens/UiKitScreen') as DevScreenModule;
  DevScreen = devModule.UiKitScreen;
}

export default function UiKitRoute() {
  if (!DevScreen) return <Redirect href={ROUTES.home} />;
  return <DevScreen />;
}
