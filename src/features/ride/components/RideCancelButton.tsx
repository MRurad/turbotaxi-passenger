import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ConfirmDialog, useToast } from '@/components/ui';

import { useCancelRide } from '../hooks/useCancelRide';
import { useRideStore } from '../store';

/** "Cancel ride" → confirm (destructive, warning haptic) → cancel-by-user. */
export function RideCancelButton() {
  const { t } = useTranslation();
  const toast = useToast();
  const rideId = useRideStore((s) => s.rideId);
  const cancel = useCancelRide();
  const [confirming, setConfirming] = useState(false);

  const confirm = () => {
    if (rideId === null) return;
    cancel.mutate(rideId, {
      onSuccess: () => setConfirming(false),
      onError: (error) => {
        setConfirming(false);
        toast.show({ message: t(error.messageKey), tone: 'danger' });
      },
    });
  };

  return (
    <>
      <Button
        label={t('ride.cancel.action')}
        variant="ghost"
        fullWidth
        onPress={() => setConfirming(true)}
        testID="ride-cancel"
      />
      <ConfirmDialog
        visible={confirming}
        title={t('ride.cancel.title')}
        message={t('ride.cancel.message')}
        confirmLabel={t('ride.cancel.confirm')}
        cancelLabel={t('ride.cancel.keep')}
        destructive
        loading={cancel.isPending}
        onConfirm={confirm}
        onCancel={() => setConfirming(false)}
        testID="ride-cancel-dialog"
      />
    </>
  );
}
