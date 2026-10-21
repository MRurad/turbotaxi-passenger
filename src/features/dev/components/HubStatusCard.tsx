import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, Card, Text, type Tone } from '@/components/ui';
import type { HubConnectionManager, HubState } from '@/realtime/HubConnectionManager';
import { useHubState } from '@/realtime/useHubState';
import { makeStyles } from '@/theme';

const TONE: Record<HubState, Tone> = {
  idle: 'neutral',
  connecting: 'warning',
  connected: 'success',
  reconnecting: 'warning',
  disconnected: 'danger',
};

export interface HubStatusCardProps<M extends Record<string, unknown>> {
  title: string;
  hub: HubConnectionManager<M>;
}

/** Live state of one hub with start/stop. */
export function HubStatusCard<M extends Record<string, unknown>>({
  title,
  hub,
}: HubStatusCardProps<M>) {
  const styles = useStyles();
  const { t } = useTranslation();
  const state = useHubState(hub);

  return (
    <Card variant="outlined" style={styles.card}>
      <View style={styles.row}>
        <Text variant="bodyStrong" style={styles.title}>
          {title}
        </Text>
        <Badge label={t(`dev.realtime.state.${state}`)} tone={TONE[state]} />
      </View>
      <View style={styles.row}>
        <Button
          label={t('dev.realtime.start')}
          size="sm"
          variant="secondary"
          onPress={() => hub.start().catch(() => undefined)}
          disabled={state === 'connecting' || state === 'connected' || state === 'reconnecting'}
          style={styles.flex}
        />
        <Button
          label={t('dev.realtime.stop')}
          size="sm"
          variant="ghost"
          onPress={() => hub.stop().catch(() => undefined)}
          disabled={state === 'idle'}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  title: { flex: 1 },
  flex: { flex: 1 },
}));
