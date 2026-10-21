import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { UiKitScreen } from '@/features/dev/screens/UiKitScreen';

// Temporary dev-only route for reviewing the design system on device.
export default function UiKitRoute() {
  if (!__DEV__) return <Redirect href={ROUTES.home} />;
  return <UiKitScreen />;
}
