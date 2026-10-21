import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import type { PropsWithChildren } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme';

export interface BottomPanelProps {
  /** Reports the panel's visible height (content + handle), e.g. to pad the map above it. */
  onHeightChange?: (height: number) => void;
  testID?: string;
}

/**
 * Always-visible themed bottom sheet over the map (not a modal: no backdrop, can't be closed).
 * Sizes itself to its content.
 */
export function BottomPanel({
  onHeightChange,
  testID,
  children,
}: PropsWithChildren<BottomPanelProps>) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const onLayout = (e: LayoutChangeEvent) =>
    onHeightChange?.(e.nativeEvent.layout.height + styles.handleArea.height);

  return (
    <BottomSheet
      index={0}
      enableDynamicSizing
      enablePanDownToClose={false}
      // Large Dynamic Type on small phones must not bury the map.
      maxDynamicContentSize={windowHeight * MAX_PANEL_HEIGHT_RATIO}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      style={styles.shadow}
    >
      <BottomSheetView
        testID={testID}
        onLayout={onLayout}
        style={[styles.content, { paddingBottom: insets.bottom + styles.content.paddingTop }]}
      >
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

/** The panel never takes more than this share of the screen. */
const MAX_PANEL_HEIGHT_RATIO = 0.55;

const useStyles = makeStyles((t) => ({
  background: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: t.radii.xl,
    borderTopRightRadius: t.radii.xl,
  },
  handle: { backgroundColor: t.colors.borderStrong, width: t.sizes.sheetHandle },
  // gorhom's default handle area height (indicator + vertical padding).
  handleArea: { height: t.spacing.xl },
  // Dark mode: a hairline border instead of a heavy shadow (design system rule).
  shadow: t.isDark
    ? {
        borderTopWidth: t.sizes.border,
        borderColor: t.colors.border,
        borderTopLeftRadius: t.radii.xl,
        borderTopRightRadius: t.radii.xl,
      }
    : { ...t.shadows.lg },
  content: { paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.sm, gap: t.spacing.lg },
}));
