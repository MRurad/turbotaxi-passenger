import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import type { TypographyVariant } from '@/theme';

import { Section } from './Section';

const VARIANTS: TypographyVariant[] = [
  'display',
  'title',
  'heading',
  'body',
  'bodyStrong',
  'caption',
  'label',
];

export function TypographySection() {
  const { t } = useTranslation();
  return (
    <Section title={t('dev.uiKit.sections.typography')}>
      {VARIANTS.map((v) => (
        <Text key={v} variant={v}>
          {t(`dev.uiKit.typography.${v}`)}
        </Text>
      ))}
      <Text variant="body" color="textSecondary">
        {t('dev.uiKit.typography.body')}
      </Text>
      <Text variant="caption" color="textMuted">
        {t('dev.uiKit.typography.caption')}
      </Text>
    </Section>
  );
}
