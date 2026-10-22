import { Redirect, useLocalSearchParams } from 'expo-router';

import { ROUTES } from '@/constants/routes';
import { TripDetailScreen } from '@/features/history/screens/TripDetailScreen';

export default function TripDetailRoute() {
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const id = Number(rideId);
  if (!Number.isInteger(id) || id <= 0) return <Redirect href={ROUTES.history} />;
  return <TripDetailScreen rideId={id} />;
}
