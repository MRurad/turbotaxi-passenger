import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';

import { useIsOnline } from '@/lib/network';

/**
 * Mounted once (AppProviders): tells screen-reader users when the device goes offline and when
 * it's back. The banners only render; several can be mounted at once (stack screens).
 */
export function OfflineAnnouncer() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const wasOnline = useRef(online);

  useEffect(() => {
    if (online === wasOnline.current) return;
    wasOnline.current = online;
    AccessibilityInfo.announceForAccessibility(
      online ? t('common.connection.restored') : t('common.connection.offline'),
    );
  }, [online, t]);

  return null;
}
