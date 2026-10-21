import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { MONO_FONT_FAMILY, makeStyles } from '@/theme';

import { DEV_INSPECTOR_COPY } from '../copy';

export interface NetworkLogBlockProps {
  title: string;
  body: string | null;
}

/**
 * A titled, selectable monospace block (URL / headers / request / response). Scrolls
 * sideways instead of wrapping, so JSON keeps its indentation on small phones.
 */
export function NetworkLogBlock({ title, body }: NetworkLogBlockProps) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Text variant="label" color="textMuted">
        {title}
      </Text>
      <ScrollView horizontal nestedScrollEnabled style={styles.code}>
        <Text variant="caption" style={styles.mono} selectable>
          {body ?? DEV_INSPECTOR_COPY.network.noBody}
        </Text>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.spacing.xxs, paddingTop: t.spacing.sm },
  code: { backgroundColor: t.colors.surface, borderRadius: t.radii.sm, padding: t.spacing.sm },
  mono: { fontFamily: MONO_FONT_FAMILY, color: t.colors.textSecondary },
}));
