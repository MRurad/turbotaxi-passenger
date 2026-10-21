import { useRouter } from 'expo-router';

import { Divider, Header, Screen } from '@/components/ui';
import { ROUTES } from '@/constants/routes';

import { ButtonsSection } from '../components/ButtonsSection';
import { InputsSection } from '../components/InputsSection';
import { OverlaysSection } from '../components/OverlaysSection';
import { StatesSection } from '../components/StatesSection';
import { SurfacesSection } from '../components/SurfacesSection';
import { ThemeModeSwitch } from '../components/ThemeModeSwitch';
import { TypographySection } from '../components/TypographySection';
import { UI_KIT_COPY } from '../uiKitCopy';

/** Dev-only showcase of every shared component, with a light/dark/system toggle. */
export function UiKitScreen() {
  const router = useRouter();

  return (
    <Screen
      scroll
      keyboardAvoiding
      header={
        <Header
          large
          title={UI_KIT_COPY.title}
          subtitle={UI_KIT_COPY.subtitle}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(ROUTES.home))}
          backLabel={UI_KIT_COPY.back}
        />
      }
    >
      <ThemeModeSwitch />
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
      <OverlaysSection />
    </Screen>
  );
}
