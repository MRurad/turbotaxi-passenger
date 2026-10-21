import { Platform, type ViewStyle } from 'react-native';

import { palette } from './palette';

type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

function shadow(offsetY: number, radius: number, opacity: number, elevation: number): ShadowStyle {
  return Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    default: { elevation, shadowColor: palette.shadow },
  });
}

const NONE: ShadowStyle = {};

export interface Shadows {
  none: ShadowStyle;
  sm: ShadowStyle;
  md: ShadowStyle;
  lg: ShadowStyle;
}

const lightShadows: Shadows = {
  none: NONE,
  sm: shadow(1, 3, 0.06, 1),
  md: shadow(4, 14, 0.08, 3),
  lg: shadow(12, 28, 0.12, 8),
};

/** Dark mode relies on borders + elevated surfaces; only overlays keep a lift. */
const darkShadows: Shadows = {
  none: NONE,
  sm: NONE,
  md: NONE,
  lg: shadow(12, 28, 0.4, 8),
};

export function getShadows(isDark: boolean): Shadows {
  return isDark ? darkShadows : lightShadows;
}
