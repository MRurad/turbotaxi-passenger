import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, Card, Chip, Divider, ListItem, Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { UI_KIT_COPY } from '../uiKitCopy';
import { Section } from './Section';

type ChipKey = keyof typeof UI_KIT_COPY.chips;
const CHIP_KEYS: ChipKey[] = ['economy', 'comfort', 'business', 'minivan'];
const noop = () => undefined;

export function SurfacesSection() {
  const styles = useStyles();
  const { sizes, spacing } = useTheme();
  // Align dividers with the text column after the 44pt icon.
  const listInset = sizes.avatar.md + spacing.md + spacing.sm;
  const [chip, setChip] = useState<ChipKey>('comfort');
  const c = UI_KIT_COPY;

  return (
    <>
      <Section title={c.sections.cards}>
        <Card animated>
          <View style={styles.cardRow}>
            <View style={styles.flex}>
              <Text variant="heading">{c.card.title}</Text>
              <Text variant="caption" color="textSecondary">
                {c.card.subtitle}
              </Text>
            </View>
            <Text variant="heading" color="primary">
              {c.card.price}
            </Text>
          </View>
        </Card>
        <Card variant="outlined" onPress={noop} accessibilityLabel={c.card.pressable}>
          <Text variant="bodyStrong">{c.card.pressable}</Text>
        </Card>
        <Card variant="soft">
          <Text variant="bodyStrong" color="primary">
            {c.card.soft}
          </Text>
        </Card>
      </Section>
      <Section title={c.sections.list}>
        <Card padding="xs">
          <ListItem
            icon="home-outline"
            title={c.list.home}
            subtitle={c.list.homeAddress}
            onPress={noop}
          />
          <Divider spacing="xxs" inset={listInset} />
          <ListItem
            icon="briefcase-outline"
            title={c.list.work}
            subtitle={c.list.workAddress}
            onPress={noop}
          />
          <Divider spacing="xxs" inset={listInset} />
          <ListItem
            left={<Avatar name={c.avatarName} size="md" />}
            title={c.list.trip}
            subtitle={c.list.tripDate}
            value={c.list.tripPrice}
          />
        </Card>
      </Section>
      <Section title={c.sections.badges} row>
        <Badge label={c.badges.neutral} />
        <Badge label={c.badges.primary} tone="primary" icon="car" />
        <Badge label={c.badges.success} tone="success" icon="checkmark" />
        <Badge label={c.badges.warning} tone="warning" />
        <Badge label={c.badges.danger} tone="danger" />
      </Section>
      <Section title={c.sections.chips} row>
        {CHIP_KEYS.map((key) => (
          <Chip
            key={key}
            label={c.chips[key]}
            selected={chip === key}
            onPress={() => setChip(key)}
          />
        ))}
        <Chip label={c.buttons.disabled} disabled onPress={noop} />
      </Section>
      <Section title={c.sections.avatars} row>
        <Avatar name={c.avatarName} size="sm" />
        <Avatar name={c.avatarName} size="md" />
        <Avatar name={c.avatarName} size="lg" />
      </Section>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  flex: { flex: 1, gap: t.spacing.xxs },
}));
