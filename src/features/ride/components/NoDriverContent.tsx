import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { Button, EmptyState, useToast } from '@/components/ui';

import { useIsOnline } from '@/lib/network';

import { useCreateRide } from '../hooks/useCreateRide';
import { useRideStore } from '../store';

/** Nobody accepted within the search timeout: search again (same trip) or give up. */
export function NoDriverContent() {
  const { t } = useTranslation();
  const toast = useToast();
  const { pickup, destination, vehicleType, reset } = useRideStore(
    useShallow((s) => ({
      pickup: s.pickup,
      destination: s.destination,
      vehicleType: s.vehicleType,
      reset: s.reset,
    })),
  );
  const create = useCreateRide();
  const online = useIsOnline();

  const retry = () => {
    if (!pickup || !destination || create.isPending || !online) return;
    create.mutate(
      { pickup, destination, vehicleType },
      { onError: (error) => toast.show({ message: t(error.messageKey), tone: 'danger' }) },
    );
  };

  return (
    <>
      <EmptyState
        icon="car-outline"
        title={t('ride.noDriver.title')}
        message={t('ride.noDriver.message')}
        testID="ride-no-driver"
      />
      {pickup && destination ? (
        <Button
          label={t('ride.noDriver.retry')}
          size="lg"
          fullWidth
          loading={create.isPending}
          disabled={!online}
          onPress={retry}
          testID="ride-retry"
        />
      ) : null}
      <Button
        label={t('common.actions.cancel')}
        variant="ghost"
        fullWidth
        disabled={create.isPending}
        onPress={reset}
        testID="ride-give-up"
      />
    </>
  );
}
