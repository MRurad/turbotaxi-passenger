import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { useRealtimeDebug } from '@/realtime/debugLog';
import { MONO_FONT_FAMILY, makeStyles } from '@/theme';

import { Section } from './Section';

const JSON_INDENT = 2;

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, JSON_INDENT);
  } catch {
    return String(value);
  }
}

/** The last received hub events with their raw arguments (newest first). */
export function RealtimeEventList() {
  const styles = useStyles();
  const { t } = useTranslation();
  const events = useRealtimeDebug((s) => s.events);
  const clear = useRealtimeDebug((s) => s.clear);

  return (
    <Section title={t('dev.realtime.events', { count: events.length })}>
      <Button label={t('dev.realtime.clear')} size="sm" variant="ghost" onPress={clear} />
      {events.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('dev.realtime.noEvents')}
        </Text>
      ) : (
        events.map((event) => (
          <Card key={event.id} variant="outlined" padding="md" style={styles.card}>
            <View style={styles.header}>
              <Text variant="bodyStrong" style={styles.name} selectable>
                {event.name}
              </Text>
              <Badge label={event.hub} />
              <Badge
                label={event.known ? t('dev.realtime.known') : t('dev.realtime.unknown')}
                tone={event.known ? 'success' : 'warning'}
              />
            </View>
            <Text variant="caption" color="textMuted">
              {formatTime(new Date(event.at).toISOString())}
            </Text>
            <Text variant="caption" style={styles.json} selectable>
              {stringify(event.args)}
            </Text>
          </Card>
        ))
      )}
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.spacing.xs },
  name: { flexGrow: 1 },
  json: { fontFamily: MONO_FONT_FAMILY, color: t.colors.textSecondary },
}));
