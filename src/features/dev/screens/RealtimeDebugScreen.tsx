import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip, Divider, Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { chatHub } from '@/realtime/chatHub';
import { HUBS } from '@/realtime/events';
import { userHub } from '@/realtime/userHub';
import { makeStyles } from '@/theme';

import { HubStatusCard } from '../components/HubStatusCard';
import { NetworkLogList } from '../components/NetworkLogList';
import { RealtimeActions } from '../components/RealtimeActions';
import { RealtimeEventList } from '../components/RealtimeEventList';
import { Section } from '../components/Section';
import { DEV_INSPECTOR_COPY } from '../copy';

type InspectorTab = 'realtime' | 'network';
const TABS: readonly InspectorTab[] = ['realtime', 'network'];

/**
 * Dev-only inspector. Realtime: hub states, buttons for every hub method and the last 50
 * received events. Network: every API / Google HTTP request (Expo Go has no Network tab).
 */
export function RealtimeDebugScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { t } = useTranslation();
  const [tab, setTab] = useState<InspectorTab>('realtime');
  const network = tab === 'network';

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <Header
          large
          title={network ? DEV_INSPECTOR_COPY.network.title : t('dev.realtime.title')}
          subtitle={network ? DEV_INSPECTOR_COPY.network.subtitle : t('dev.realtime.subtitle')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.home))}
          backLabel={t('common.a11y.back')}
        />
      }
    >
      <View
        style={styles.tabs}
        accessibilityRole="radiogroup"
        accessibilityLabel={DEV_INSPECTOR_COPY.tabsLabel}
      >
        {TABS.map((value) => (
          <Chip
            key={value}
            label={DEV_INSPECTOR_COPY.tabs[value]}
            role="radio"
            selected={tab === value}
            onPress={() => setTab(value)}
            testID={`dev-tab-${value}`}
          />
        ))}
      </View>
      {network ? (
        <NetworkLogList />
      ) : (
        <>
          <Section title={t('dev.realtime.connections')}>
            <HubStatusCard title={HUBS.user} hub={userHub} />
            <HubStatusCard title={HUBS.chat} hub={chatHub} />
          </Section>
          <Divider />
          <RealtimeActions />
          <Divider />
          <RealtimeEventList />
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  tabs: { flexDirection: 'row', gap: t.spacing.sm },
}));
