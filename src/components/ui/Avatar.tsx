import { Image, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: AvatarSize;
  testID?: string;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, uri, size = 'md', testID }: AvatarProps) {
  const styles = useStyles();
  const { sizes } = useTheme();
  const dimension = sizes.avatar[size];
  const shape = { width: dimension, height: dimension, borderRadius: dimension / 2 };

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[styles.base, shape]}
    >
      {uri ? (
        <Image source={{ uri }} style={shape} accessibilityIgnoresInvertColors />
      ) : (
        <Text
          variant={size === 'lg' ? 'title' : size === 'md' ? 'bodyStrong' : 'caption'}
          color="primary"
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: t.colors.primarySoft,
  },
}));
