import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { useCallback, useState, type PropsWithChildren, type ReactNode } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/theme';

import { BottomPanelFooter, BottomPanelFooterContext } from './BottomPanelFooter';

export interface BottomPanelProps {
  /** Reports the panel's visible height (content + handle), e.g. to pad the map above it. */
  onHeightChange?: (height: number) => void;
  /** Pinned to the bottom, always visible even when the content scrolls (e.g. "Order"). */
  footer?: ReactNode;
  /** Content scrolls once the panel reaches its maximum height. */
  scrollable?: boolean;
  testID?: string;
}

/** The panel never takes more than this share of the screen. */
const MAX_PANEL_HEIGHT_RATIO = 0.62;

/**
 * Always-visible themed bottom sheet over the map (not a modal: no backdrop, can't be closed).
 * Sizes itself to its content up to MAX_PANEL_HEIGHT_RATIO of the screen.
 */
export function BottomPanel({
  onHeightChange,
  footer,
  scrollable = false,
  testID,
  children,
}: PropsWithChildren<BottomPanelProps>) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { sizes, spacing } = useTheme();
  const maxContent = windowHeight * MAX_PANEL_HEIGHT_RATIO;
  // Seeded with a typical footer (one large button) so the first measure doesn't jump.
  const [footerHeight, setFooterHeight] = useState(
    sizes.button.lg + spacing.md * 2 + insets.bottom,
  );
  const bottomPadding = (footer ? footerHeight : insets.bottom) + styles.content.paddingTop;

  const report = useCallback(
    (contentHeight: number) =>
      // Same clamp as gorhom: content + handle, capped at maxDynamicContentSize.
      onHeightChange?.(Math.min(contentHeight + styles.handleArea.height, maxContent)),
    [onHeightChange, maxContent, styles.handleArea.height],
  );

  const onFooterLayout = useCallback(
    (e: LayoutChangeEvent) => setFooterHeight(e.nativeEvent.layout.height),
    [],
  );
  // A new value on every render on purpose (`footer` is a fresh element): it only re-renders
  // the footer's content — the footer component itself stays mounted.
  const footerValue = {
    content: footer,
    paddingBottom: insets.bottom + spacing.md,
    onLayout: onFooterLayout,
  };

  const contentStyle = [styles.content, { paddingBottom: bottomPadding }];

  return (
    <BottomPanelFooterContext.Provider value={footerValue}>
      <BottomSheet
        index={0}
        enableDynamicSizing
        enablePanDownToClose={false}
        // Large Dynamic Type / long lists on small phones must not bury the map.
        maxDynamicContentSize={maxContent}
        // A stable component type: see BottomPanelFooter.
        footerComponent={footer ? BottomPanelFooter : undefined}
        backgroundStyle={styles.background}
        handleIndicatorStyle={styles.handle}
        style={styles.shadow}
      >
        {scrollable ? (
          <BottomSheetScrollView
            testID={testID}
            contentContainerStyle={contentStyle}
            onContentSizeChange={(_w, h) => report(h)}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </BottomSheetScrollView>
        ) : (
          <BottomSheetView
            testID={testID}
            onLayout={(e: LayoutChangeEvent) => report(e.nativeEvent.layout.height)}
            style={contentStyle}
          >
            {children}
          </BottomSheetView>
        )}
      </BottomSheet>
    </BottomPanelFooterContext.Provider>
  );
}

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
