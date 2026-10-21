import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, PressableScale, type SheetRef } from '@/components/ui';
import { useAuthStore } from '@/features/auth/store';
import { makeStyles } from '@/theme';

import { HomeMenuSheet } from './HomeMenuSheet';

/** Floating bar over the map. The avatar opens the account menu (full profile in Prompt 11). */
export function HomeTopBar() {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const menuRef = useRef<SheetRef>(null);
  const user = useAuthStore((s) => s.user);
  const name = [user?.name, user?.surname].filter(Boolean).join(' ') || t('common.appName');

  return (
    <View style={[styles.bar, { top: insets.top }]} pointerEvents="box-none">
      <PressableScale
        onPress={() => menuRef.current?.present()}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={t('home.menu')}
        style={styles.avatarButton}
        testID="home-menu"
      >
        <Avatar name={name} size="md" />
      </PressableScale>
      <HomeMenuSheet ref={menuRef} onClose={() => menuRef.current?.dismiss()} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    position: 'absolute',
    left: t.spacing.lg,
    right: t.spacing.lg,
    paddingTop: t.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    width: t.sizes.mapControl,
    height: t.sizes.mapControl,
    borderRadius: t.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceElevated,
    borderWidth: t.isDark ? t.sizes.border : 0,
    borderColor: t.colors.border,
    ...t.shadows.md,
  },
}));
