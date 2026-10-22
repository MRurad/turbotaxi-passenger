import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, PressableScale } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/features/auth/store';
import { makeStyles } from '@/theme';

/** Floating bar over the map (home and ride screens). The avatar opens the profile. */
export function HomeTopBar() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const name = [user?.name, user?.surname].filter(Boolean).join(' ') || t('common.appName');

  return (
    <View style={[styles.bar, { top: insets.top }]} pointerEvents="box-none">
      <PressableScale
        onPress={() => router.push(ROUTES.profile)}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={t('home.menu')}
        style={styles.avatarButton}
        testID="home-menu"
      >
        <Avatar name={name} size="md" />
      </PressableScale>
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
