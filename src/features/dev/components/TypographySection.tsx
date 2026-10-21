import { Text } from '@/components/ui';
import type { TypographyVariant } from '@/theme';

import { UI_KIT_COPY } from '../uiKitCopy';
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
  return (
    <Section title={UI_KIT_COPY.sections.typography}>
      {VARIANTS.map((v) => (
        <Text key={v} variant={v}>
          {UI_KIT_COPY.typography[v]}
        </Text>
      ))}
      <Text variant="body" color="textSecondary">
        {UI_KIT_COPY.typography.body}
      </Text>
      <Text variant="caption" color="textMuted">
        {UI_KIT_COPY.typography.caption}
      </Text>
    </Section>
  );
}
