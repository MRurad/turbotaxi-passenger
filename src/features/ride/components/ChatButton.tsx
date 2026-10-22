import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Button, Text } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { useChatStore } from '@/features/chat/store';
import { makeStyles } from '@/theme';

import { useRideStore } from '../store';

/** Unread counts above this show as "9+". */
const MAX_BADGE_COUNT = 9;
/** The badge text stays legible but never outgrows its pill. */
const BADGE_MAX_FONT_SCALE = 1.3;

/** "Message" button on the driver card, with an unread badge for driver messages. */
export function ChatButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const rideId = useRideStore((s) => s.rideId);
  const unread = useChatStore((s) => (rideId === null ? 0 : (s.unread[rideId] ?? 0)));
  const badge = unread > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(unread);

  const open = () => {
    if (rideId === null) return;
    router.push({ pathname: ROUTES.chat, params: { rideId: String(rideId) } });
  };

  return (
    <View style={[styles.wrap, style]}>
      <Button
        label={t('common.actions.chat')}
        accessibilityLabel={
          unread > 0 ? t('ride.driver.chatWithUnread', { count: unread }) : t('ride.driver.chat')
        }
        variant="secondary"
        leftIcon="chatbubble-ellipses"
        onPress={open}
        disabled={rideId === null}
        testID="ride-chat"
      />
      {unread > 0 ? (
        <View style={styles.badge} pointerEvents="none" testID="ride-chat-badge">
          <Text
            variant="caption"
            color="textOnPrimary"
            style={styles.badgeText}
            maxFontSizeMultiplier={BADGE_MAX_FONT_SCALE}
          >
            {badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -t.spacing.xs,
    right: -t.spacing.xs,
    minWidth: t.sizes.icon.lg,
    minHeight: t.sizes.icon.lg,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radii.pill,
    // Strong red: AA for the small white count.
    backgroundColor: t.colors.dangerPressed,
    borderWidth: t.sizes.focusBorder,
    borderColor: t.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: t.typography.bodyStrong.fontFamily },
}));
