import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { EmptyState, ErrorState, ListItem, Skeleton } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';
import type { PlaceSuggestion } from '@/types/place';

import { PoweredByGoogle } from './PoweredByGoogle';

const SKELETON_ROWS = 4;

export interface SuggestionListProps {
  suggestions: PlaceSuggestion[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelect: (suggestion: PlaceSuggestion) => void;
  /** Disables rows while a pick is being resolved. */
  busy: boolean;
}

/** Autocomplete results with loading skeleton, error and empty states. */
export function SuggestionList({
  suggestions,
  loading,
  error,
  onRetry,
  onSelect,
  busy,
}: SuggestionListProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const { sizes } = useTheme();

  if (error && suggestions.length === 0) {
    return (
      <ErrorState
        title={t('search.error')}
        message={t('errors.network')}
        retryLabel={t('common.actions.retry')}
        onRetry={onRetry}
      />
    );
  }

  if (loading && suggestions.length === 0) {
    return (
      <View style={styles.skeletons} accessibilityLabel={t('common.labels.loading')}>
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <View key={i} style={styles.skeletonRow}>
            <Skeleton circle={sizes.avatar.md} />
            <View style={styles.skeletonText}>
              <Skeleton width="60%" height={sizes.icon.sm} />
              <Skeleton width="40%" height={sizes.icon.xs} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon="search-outline"
        title={t('search.noResults')}
        message={t('search.noResultsHint')}
      />
    );
  }

  return (
    <FlatList
      data={suggestions}
      keyExtractor={(s) => s.placeId}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <ListItem
          icon="location-outline"
          title={item.title}
          subtitle={item.subtitle || undefined}
          showChevron={false}
          onPress={() => {
            if (!busy) onSelect(item);
          }}
          testID={`suggestion-${item.placeId}`}
        />
      )}
      ListFooterComponent={PoweredByGoogle}
    />
  );
}

const useStyles = makeStyles((t) => ({
  skeletons: { gap: t.spacing.lg, padding: t.spacing.sm },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  skeletonText: { flex: 1, gap: t.spacing.sm },
}));
