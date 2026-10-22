import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Avatar, Button, Card, Divider, Header, ListItem, Screen, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/features/auth/store';
import { formatPhoneMask, toNationalDigits } from '@/features/auth/utils/phone';
import { PHONE_COUNTRY_CODE } from '@/features/auth/constants';
import { makeStyles } from '@/theme';

/** Opened from the avatar (also during a ride): who I am, and the account menu. */
export function ProfileScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const name =
    [user?.name, user?.surname].filter(Boolean).join(' ') ||
    user?.email ||
    t('ride.driver.fallbackName');
  const phone = user?.phoneNumber
    ? `${PHONE_COUNTRY_CODE} ${formatPhoneMask(toNationalDigits(user.phoneNumber))}`
    : null;

  return (
    <Screen
      scroll
      header={
        <Header
          title={t('profile.title')}
          onBack={() => router.back()}
          backLabel={t('common.a11y.back')}
        />
      }
      contentStyle={styles.content}
      testID="profile-screen"
    >
      <Card variant="outlined" padding="lg" style={styles.card}>
        <View style={styles.identity}>
          <Avatar name={name} size="lg" />
          <View style={styles.text}>
            <Text variant="heading" accessibilityRole="header" numberOfLines={2}>
              {name}
            </Text>
            {phone ? (
              <Text variant="body" color="textSecondary">
                {phone}
              </Text>
            ) : null}
            {user?.email ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>
        <Button
          label={t('profile.edit')}
          variant="secondary"
          leftIcon="create-outline"
          fullWidth
          onPress={() => router.push(ROUTES.profileEdit)}
          testID="profile-edit"
        />
      </Card>

      <View>
        <ListItem
          icon="time-outline"
          title={t('profile.menu.trips')}
          onPress={() => router.push(ROUTES.history)}
          testID="menu-trips"
        />
        <Divider />
        <ListItem
          icon="pricetag-outline"
          title={t('profile.menu.promos')}
          onPress={() => router.push(ROUTES.promos)}
          testID="menu-promos"
        />
        <Divider />
        <ListItem
          icon="settings-outline"
          title={t('profile.menu.settings')}
          onPress={() => router.push(ROUTES.settings)}
          testID="menu-settings"
        />
        {__DEV__ ? (
          <>
            <Divider />
            <ListItem
              icon="color-palette-outline"
              title={t('dev.uiKit.open')}
              onPress={() => router.push(ROUTES.devUiKit)}
            />
            <Divider />
            <ListItem
              icon="pulse-outline"
              title={t('dev.realtime.open')}
              onPress={() => router.push(ROUTES.devRealtime)}
            />
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { gap: t.spacing.xl },
  card: { gap: t.spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg },
  text: { flex: 1, gap: t.spacing.xxs },
}));
