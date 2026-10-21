import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Divider, Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

import { ButtonsSection } from '../components/ButtonsSection';
import { FormatsSection } from '../components/FormatsSection';
import { InputsSection } from '../components/InputsSection';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { OverlaysSection } from '../components/OverlaysSection';
import { StatesSection } from '../components/StatesSection';
import { SurfacesSection } from '../components/SurfacesSection';
import { ThemeModeSwitch } from '../components/ThemeModeSwitch';
import { TypographySection } from '../components/TypographySection';

/** Dev-only showcase of every shared component, with theme and language toggles. */
export function UiKitScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <Header
          large
          title={t('dev.uiKit.title')}
          subtitle={t('dev.uiKit.subtitle')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.home))}
          backLabel={t('common.a11y.back')}
        />
      }
    >
      <ThemeModeSwitch />
      <LanguageSwitch />
      <TypographySection />
      <Divider />
      <ButtonsSection />
      <Divider />
      <InputsSection />
      <Divider />
      <SurfacesSection />
      <Divider />
      <StatesSection />
      <Divider />
      <FormatsSection />
      <Divider />
      <OverlaysSection />
    </Screen>
  );
}
