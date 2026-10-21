import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Input, useToast } from '@/components/ui';
import { joinRideChat, leaveRideChat } from '@/realtime/chatHub';
import { CHAT_HUB_METHODS, USER_HUB_METHODS } from '@/realtime/events';
import {
  pingUserHub,
  subscribeToDriverLocation,
  subscribeUser,
  unsubscribeFromDriverLocation,
  unsubscribeUser,
} from '@/realtime/userHub';
import { makeStyles } from '@/theme';

import { Section } from './Section';

const toId = (text: string) => Number.parseInt(text, 10);
const isId = (text: string) => Number.isInteger(toId(text)) && toId(text) > 0;

/** Buttons that invoke every client → server hub method, for testing with the backend. */
export function RealtimeActions() {
  const styles = useStyles();
  const { t } = useTranslation();
  const toast = useToast();
  const [driverId, setDriverId] = useState('');
  const [rideId, setRideId] = useState('');

  const run = (label: string, call: () => Promise<unknown>) => {
    Promise.resolve()
      .then(call)
      .then(() =>
        toast.show({ message: t('dev.realtime.invoked', { method: label }), tone: 'success' }),
      )
      .catch((error: unknown) =>
        toast.show({
          message: t('dev.realtime.failed', {
            method: label,
            message: error instanceof Error ? error.message : String(error),
          }),
          tone: 'danger',
        }),
      );
  };

  return (
    <>
      <Section title={t('dev.realtime.userHub')}>
        <View style={styles.row}>
          <Button
            label={USER_HUB_METHODS.subscribeUser}
            size="sm"
            onPress={() => run(USER_HUB_METHODS.subscribeUser, subscribeUser)}
            style={styles.flex}
          />
          <Button
            label={USER_HUB_METHODS.unsubscribeUser}
            size="sm"
            variant="secondary"
            onPress={() => run(USER_HUB_METHODS.unsubscribeUser, unsubscribeUser)}
            style={styles.flex}
          />
        </View>
        <Button
          label={USER_HUB_METHODS.ping}
          size="sm"
          variant="secondary"
          onPress={() => run(USER_HUB_METHODS.ping, pingUserHub)}
        />
        <Input
          label={t('dev.realtime.driverId')}
          value={driverId}
          onChangeText={setDriverId}
          keyboardType="number-pad"
        />
        <Button
          label={USER_HUB_METHODS.subscribeDriverLocation}
          size="sm"
          onPress={() =>
            run(USER_HUB_METHODS.subscribeDriverLocation, () =>
              subscribeToDriverLocation(toId(driverId)),
            )
          }
          disabled={!isId(driverId)}
        />
        <Button
          label={USER_HUB_METHODS.unsubscribeDriverLocation}
          size="sm"
          variant="secondary"
          onPress={() =>
            run(USER_HUB_METHODS.unsubscribeDriverLocation, () =>
              unsubscribeFromDriverLocation(toId(driverId)),
            )
          }
          disabled={!isId(driverId)}
        />
      </Section>
      <Section title={t('dev.realtime.chatHub')}>
        <Input
          label={t('dev.realtime.rideId')}
          value={rideId}
          onChangeText={setRideId}
          keyboardType="number-pad"
        />
        <View style={styles.row}>
          <Button
            label={CHAT_HUB_METHODS.joinRideChat}
            size="sm"
            onPress={() => run(CHAT_HUB_METHODS.joinRideChat, () => joinRideChat(toId(rideId)))}
            disabled={!isId(rideId)}
            style={styles.flex}
          />
          <Button
            label={CHAT_HUB_METHODS.leaveRideChat}
            size="sm"
            variant="secondary"
            onPress={() => run(CHAT_HUB_METHODS.leaveRideChat, () => leaveRideChat(toId(rideId)))}
            disabled={!isId(rideId)}
            style={styles.flex}
          />
        </View>
      </Section>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.sm },
  flex: { flex: 1 },
}));
