import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, ConfirmDialog, ListItem, Text, useToast } from '@/components/ui';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { isActivePhase } from '@/features/ride/snapshot';
import { useRideStore } from '@/features/ride/store';

import { useDeleteAccount } from '../hooks/useDeleteAccount';

type Confirming = 'logout' | 'delete' | null;

/**
 * Log out and delete account (each confirmed). Both are blocked during an active ride: there
 * is no GET active ride, so leaving would orphan the ride on the server.
 */
export function AccountActions() {
  const { t } = useTranslation();
  const toast = useToast();
  const logout = useLogout();
  const deleteAccount = useDeleteAccount();
  const rideActive = useRideStore((s) => isActivePhase(s.phase));
  const [confirming, setConfirming] = useState<Confirming>(null);

  const confirmDelete = () =>
    deleteAccount.mutate(undefined, {
      onError: (error) => {
        setConfirming(null);
        toast.show({ message: t(error.messageKey), tone: 'danger' });
      },
    });

  return (
    <>
      <Button
        label={t('settings.logout')}
        variant="danger"
        leftIcon="log-out-outline"
        fullWidth
        disabled={rideActive}
        onPress={() => setConfirming('logout')}
        accessibilityHint={rideActive ? t('settings.rideActiveBlocked') : undefined}
        testID="settings-logout"
      />
      <ListItem
        icon="trash-outline"
        title={t('settings.deleteAccount')}
        disabled={rideActive}
        onPress={() => setConfirming('delete')}
        testID="settings-delete-account"
      />
      {rideActive ? (
        <Text variant="caption" color="textSecondary">
          {t('settings.rideActiveBlocked')}
        </Text>
      ) : null}
      <ConfirmDialog
        visible={confirming === 'logout'}
        destructive
        title={t('auth.logout.title')}
        message={t('auth.logout.message')}
        confirmLabel={t('auth.logout.confirm')}
        cancelLabel={t('common.actions.cancel')}
        onConfirm={() => {
          setConfirming(null);
          logout().catch(() => undefined);
        }}
        onCancel={() => setConfirming(null)}
        testID="logout-dialog"
      />
      <ConfirmDialog
        visible={confirming === 'delete'}
        destructive
        title={t('settings.deleteConfirm.title')}
        message={t('settings.deleteConfirm.message')}
        confirmLabel={t('settings.deleteConfirm.confirm')}
        cancelLabel={t('common.actions.cancel')}
        loading={deleteAccount.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setConfirming(null)}
        testID="delete-account-dialog"
      />
    </>
  );
}
