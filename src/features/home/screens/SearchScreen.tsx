import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { makeStyles } from '@/theme';

import { SearchFields } from '../components/SearchFields';
import { SearchShortcuts } from '../components/SearchShortcuts';
import { SuggestionList } from '../components/SuggestionList';
import { usePlaceSearch } from '../hooks/usePlaceSearch';
import { useRecentPlaces } from '../recentPlaces';

/** Modal: pickup + destination search with Google autocomplete, recents and "Choose on map". */
export function SearchScreen() {
  const styles = useStyles();
  const { t } = useTranslation();
  const search = usePlaceSearch();
  const recents = useRecentPlaces((s) => s.places);
  const { results } = search;

  return (
    <Screen
      keyboardAvoiding
      padded={false}
      edges={['top', 'left', 'right']}
      header={
        <Header
          title={t('search.title')}
          onBack={search.close}
          backLabel={t('common.a11y.close')}
        />
      }
      testID="search-screen"
    >
      <View style={styles.fields}>
        <SearchFields
          pickupQuery={search.queries.pickup}
          destinationQuery={search.queries.destination}
          pickupPlaceholder={search.pickupPlaceholder}
          onChange={search.setQuery}
          onFocus={search.setActive}
        />
      </View>
      <View style={styles.results}>
        {results.isActive ? (
          <SuggestionList
            suggestions={results.data ?? []}
            loading={results.isFetching || results.isTyping}
            error={results.isError}
            onRetry={() => results.refetch()}
            onSelect={search.selectSuggestion}
            busy={search.resolving}
          />
        ) : (
          <SearchShortcuts
            recents={recents}
            onChooseOnMap={search.chooseOnMap}
            onSelectRecent={search.selectRecent}
          />
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  fields: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.md },
  results: { flex: 1, paddingHorizontal: t.spacing.sm },
}));
