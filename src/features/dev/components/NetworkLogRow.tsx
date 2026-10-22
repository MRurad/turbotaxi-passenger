import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { JSON_INDENT, NO_STATUS, isErrorEntry, type NetworkLogEntry } from '@/api/devNetworkLog';
import { Badge, Card, Text } from '@/components/ui';
import { formatTime } from '@/lib/format';
import { MONO_FONT_FAMILY, makeStyles } from '@/theme';

import { DEV_INSPECTOR_COPY } from '../copy';
import { NetworkLogBlock as Block } from './NetworkLogBlock';

const COPY = DEV_INSPECTOR_COPY.network;
const COLLAPSED_URL_LINES = 2;

const pathOf = (url: string) => url.split('?')[0] ?? url;

/**
 * One request. Only the header toggles (so the JSON below stays selectable/scrollable).
 * Memoized: entries are immutable, so new requests don't re-render existing rows.
 */
export const NetworkLogRow = memo(function NetworkLogRow({ entry }: { entry: NetworkLogEntry }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const failed = isErrorEntry(entry);
  const status = entry.status === null ? NO_STATUS : String(entry.status);
  const time = formatTime(new Date(entry.timestamp).toISOString());

  return (
    <Card variant="outlined" padding="md" style={styles.card}>
      <Pressable
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={COPY.rowLabel(
          entry.method,
          pathOf(entry.url),
          status,
          entry.durationMs,
        )}
        accessibilityHint={expanded ? COPY.collapseHint : COPY.expandHint}
        accessibilityState={{ expanded }}
        style={styles.header}
      >
        <View style={styles.titleRow}>
          <Badge label={entry.method} tone={entry.source === 'api' ? 'primary' : 'neutral'} />
          <Text
            variant="caption"
            style={[styles.mono, styles.url]}
            numberOfLines={COLLAPSED_URL_LINES}
          >
            {pathOf(entry.url)}
          </Text>
        </View>
        <View style={styles.meta}>
          <Badge label={status} tone={failed ? 'danger' : 'success'} />
          <Text variant="caption" color="textMuted">
            {entry.durationMs === null ? time : COPY.duration(entry.durationMs, time)}
          </Text>
        </View>
        {entry.error ? (
          <Text variant="caption" color="dangerText">
            {entry.error}
          </Text>
        ) : null}
      </Pressable>
      {expanded ? (
        <View>
          <Block title={COPY.url} body={entry.url} />
          <Block
            title={COPY.headers}
            body={JSON.stringify(entry.requestHeaders, null, JSON_INDENT)}
          />
          <Block title={COPY.request} body={entry.requestBody} />
          <Block title={COPY.response} body={entry.responseBody} />
        </View>
      ) : null}
    </Card>
  );
});

const useStyles = makeStyles((t) => ({
  card: { gap: t.spacing.xs },
  header: { gap: t.spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  url: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  mono: { fontFamily: MONO_FONT_FAMILY, color: t.colors.textSecondary },
}));
