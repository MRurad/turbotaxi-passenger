import { useState } from 'react';
import { View } from 'react-native';

import { isErrorEntry } from '@/api/devNetworkLog';
import { Button, Chip, Text } from '@/components/ui';
import { makeStyles } from '@/theme';

import { DEV_INSPECTOR_COPY } from '../copy';
import { useNetworkLog } from '../hooks/useNetworkLog';
import { NetworkLogRow } from './NetworkLogRow';
import { Section } from './Section';

const COPY = DEV_INSPECTOR_COPY.network;

/** Dev HTTP log: newest first, filter all / errors, clear. */
export function NetworkLogList() {
  const styles = useStyles();
  const { entries, clear } = useNetworkLog();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const shown = errorsOnly ? entries.filter(isErrorEntry) : entries;

  return (
    <Section title={COPY.requests(shown.length)}>
      <View style={styles.toolbar}>
        <View
          style={styles.filters}
          accessibilityRole="radiogroup"
          accessibilityLabel={COPY.filterLabel}
        >
          <Chip
            label={COPY.filterAll}
            role="radio"
            selected={!errorsOnly}
            onPress={() => setErrorsOnly(false)}
          />
          <Chip
            label={COPY.filterErrors}
            role="radio"
            selected={errorsOnly}
            onPress={() => setErrorsOnly(true)}
          />
        </View>
        <View style={styles.spacer} />
        <Button
          label={COPY.clear}
          size="sm"
          variant="ghost"
          onPress={clear}
          disabled={entries.length === 0}
        />
      </View>
      {shown.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {errorsOnly ? COPY.emptyErrors : COPY.empty}
        </Text>
      ) : (
        shown.map((entry) => <NetworkLogRow key={entry.id} entry={entry} />)
      )}
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.spacing.sm },
  filters: { flexDirection: 'row', gap: t.spacing.sm },
  spacer: { flex: 1 },
}));
