import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

/** Brand block for the welcome screen: steel-blue panel, decorative rings and a car mark. */
export function AuthHero() {
  const styles = useStyles();
  const { t } = useTranslation();
  const { colors, sizes, motion } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration.slow)} style={styles.hero}>
      <View style={[styles.ring, styles.ringLarge]} importantForAccessibility="no" />
      <View style={[styles.ring, styles.ringSmall]} importantForAccessibility="no" />
      <View style={styles.mark}>
        <Ionicons name="car-sport" size={sizes.hero.icon} color={colors.primaryFillStrong} />
      </View>
      <Text variant="display" color="textOnPrimary" align="center" accessibilityRole="header">
        {t('auth.welcome.title')}
      </Text>
      <Text variant="body" color="textOnPrimary" align="center" style={styles.tagline}>
        {t('auth.welcome.tagline')}
      </Text>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => {
  const { ringLarge, ringSmall, ringStroke, mark } = t.sizes.hero;
  return {
    // steel.600 fill: white 16 pt body text passes AA (steel.500 would be ~4:1).
    hero: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.md,
      padding: t.spacing.xl,
      borderRadius: t.radii.xl,
      overflow: 'hidden',
      backgroundColor: t.colors.primaryFillStrong,
    },
    ring: {
      position: 'absolute',
      borderWidth: ringStroke,
      borderColor: t.colors.textOnPrimary,
      opacity: t.motion.decorativeOpacity,
    },
    ringLarge: {
      width: ringLarge,
      height: ringLarge,
      borderRadius: ringLarge / 2,
      top: -ringLarge / 3,
      right: -ringLarge / 3,
    },
    ringSmall: {
      width: ringSmall,
      height: ringSmall,
      borderRadius: ringSmall / 2,
      bottom: -ringSmall / 3,
      left: -ringSmall / 4,
    },
    mark: {
      width: mark,
      height: mark,
      borderRadius: t.radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.textOnPrimary,
      marginBottom: t.spacing.sm,
      // Dark mode uses borders instead of heavy shadows (design system rule).
      ...(t.isDark ? { borderWidth: t.sizes.border, borderColor: t.colors.border } : t.shadows.lg),
    },
    tagline: { maxWidth: t.sizes.dialogMaxWidth },
  };
});
