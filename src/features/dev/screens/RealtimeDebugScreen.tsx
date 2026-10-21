import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Divider, Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';
import { chatHub } from '@/realtime/chatHub';
import { HUBS } from '@/realtime/events';
import { userHub } from '@/realtime/userHub';

import { HubStatusCard } from '../components/HubStatusCard';
import { RealtimeActions } from '../components/RealtimeActions';
import { RealtimeEventList } from '../components/RealtimeEventList';
import { Section } from '../components/Section';

/**
 * Dev-only SignalR inspector: hub states, buttons for every hub method, and the last 50
 * received events (raw JSON) — for discovering the real event names with the backend.
 */
export function RealtimeDebugScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <Header
          large
          title={t('dev.realtime.title')}
          subtitle={t('dev.realtime.subtitle')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.home))}
          backLabel={t('common.a11y.back')}
        />
      }
    >
      <Section title={t('dev.realtime.connections')}>
        <HubStatusCard title={HUBS.user} hub={userHub} />
        <HubStatusCard title={HUBS.chat} hub={chatHub} />
      </Section>
      <Divider />
      <RealtimeActions />
      <Divider />
      <RealtimeEventList />
    </Screen>
  );
}
