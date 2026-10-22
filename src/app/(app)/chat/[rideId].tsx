import { Redirect, useLocalSearchParams } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { ChatScreen } from '@/features/chat/screens/ChatScreen';

export default function ChatRoute() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const id = Number(rideId);
  if (!Number.isInteger(id) || id <= 0) return <Redirect href={ROUTES.home} />;
  return <ChatScreen rideId={id} />;
}
