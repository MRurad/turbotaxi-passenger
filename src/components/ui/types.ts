import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

/** Ionicons is the only icon family used in the app. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export type { HapticKind } from '@/lib/haptics';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
