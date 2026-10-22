import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { RealtimeBanner } from '@/components/RealtimeBanner';
import { Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { VEHICLES } from '@/constants/vehicles';
import { useDriverProfile } from '@/features/ride/hooks/useDriverProfile';
import { TRACKING_PHASES, useRideStore } from '@/features/ride/store';
import { mergeDriver } from '@/features/ride/utils';
import { useKeyboardVisible } from '@/lib/hooks/useKeyboardVisible';
import { makeStyles } from '@/theme';

import { ChatInputBar } from '../components/ChatInputBar';
import { MessageList } from '../components/MessageList';
import { QuickReplies } from '../components/QuickReplies';
import { useSendChatMessage } from '../hooks/useSendChatMessage';
import { useChatStore } from '../store';

/** The bottom inset is applied by hand: none while the keyboard covers the home indicator. */
const EDGES: Edge[] = ['top', 'left', 'right'];

/** Driver ↔ passenger chat for the current ride: history, live messages, quick replies. */
export function ChatScreen({ rideId }: { rideId: number }) {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const { currentRideId, tracking, driverId, eventDriver, vehicleType } = useRideStore(
    useShallow((s) => ({
      currentRideId: s.rideId,
      tracking: TRACKING_PHASES.has(s.phase),
      driverId: s.driverId,
      eventDriver: s.driver,
      vehicleType: s.vehicleType,
    })),
  );
  const driver = mergeDriver(eventDriver, useDriverProfile(driverId).data ?? null);
  const name = driver?.name ?? t('ride.driver.fallbackName');
  const car =
    [driver?.brand, driver?.model].filter(Boolean).join(' ') || t(VEHICLES[vehicleType].labelKey);
  const subtitle = driver?.plateNumber
    ? t('chat.carWithPlate', { car, plate: driver.plateNumber })
    : car;
  const { send, retry } = useSendChatMessage(rideId);

  // While this chat is open its messages aren't "unread".
  useFocusEffect(
    useCallback(() => {
      useChatStore.getState().setOpenRide(rideId);
      return () => useChatStore.getState().setOpenRide(null);
    }, [rideId]),
  );

  // Only the current ride's chat (with a driver) is live; anything else (stale link) leaves.
  if (rideId !== currentRideId || !tracking) return <Redirect href={ROUTES.ride} />;

  return (
    <Screen
      keyboardAvoiding
      edges={EDGES}
      header={
        <Header
          title={t('chat.title', { name })}
          subtitle={subtitle}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.ride))}
          backLabel={t('common.a11y.back')}
        />
      }
      footer={
        <View style={[styles.footer, { paddingBottom: keyboardVisible ? 0 : insets.bottom }]}>
          {/* Hidden while typing: on small phones the messages need the room. */}
          {keyboardVisible ? null : <QuickReplies onPick={send} />}
          <ChatInputBar onSend={send} />
        </View>
      }
      testID="chat-screen"
    >
      <MessageList rideId={rideId} driverName={name} onRetry={retry} />
      <RealtimeBanner />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: t.spacing.xs },
}));
