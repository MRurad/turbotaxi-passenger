import { useRouter } from 'expo-router';
import { useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog, ListItem, Sheet, Text, type SheetRef } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAuthStore } from '@/features/auth/store';

export interface HomeMenuSheetProps {
  ref: Ref<SheetRef>;
  onClose: () => void;
}

/** Temporary account menu behind the avatar until the profile screens (Prompt 11). */
export function HomeMenuSheet({ ref, onClose }: HomeMenuSheetProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const name = [user?.name, user?.surname].filter(Boolean).join(' ');

  return (
    <>
      <Sheet ref={ref} testID="home-menu-sheet">
        {name ? (
          <Text variant="heading" accessibilityRole="header">
            {t('home.greeting', { name: user?.name ?? name })}
          </Text>
        ) : null}
        {__DEV__ ? (
          <ListItem
            icon="color-palette-outline"
            title={t('dev.uiKit.open')}
            onPress={() => {
              onClose();
              router.push(ROUTES.devUiKit);
            }}
          />
        ) : null}
        <ListItem
          icon="log-out-outline"
          title={t('common.actions.logout')}
          onPress={() => setConfirmOpen(true)}
          testID="home-logout"
        />
      </Sheet>
      <ConfirmDialog
        visible={confirmOpen}
        destructive
        title={t('auth.logout.title')}
        message={t('auth.logout.message')}
        confirmLabel={t('auth.logout.confirm')}
        cancelLabel={t('common.actions.cancel')}
        onConfirm={() => {
          setConfirmOpen(false);
          onClose();
          logout().catch(() => undefined);
        }}
        onCancel={() => setConfirmOpen(false)}
        testID="logout-dialog"
      />
    </>
  );
}
