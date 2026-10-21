import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, type ComponentRef, type PropsWithChildren } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/theme';

/** Imperative handle: `ref.current?.present()` / `ref.current?.dismiss()`. */
export type SheetRef = ComponentRef<typeof BottomSheetModal>;

export interface SheetProps {
  /** Omit to size the sheet to its content. */
  snapPoints?: (string | number)[];
  /** Tap on the dimmed backdrop closes the sheet. Default true. */
  dismissOnBackdrop?: boolean;
  onDismiss?: () => void;
  /** Disables the drag-down-to-close gesture (e.g. while searching for a driver). */
  enablePanDownToClose?: boolean;
  keyboardBehavior?: BottomSheetModalProps['keyboardBehavior'];
  testID?: string;
}

/** Themed modal bottom sheet. Must be rendered under BottomSheetModalProvider (AppProviders). */
export const Sheet = forwardRef<SheetRef, PropsWithChildren<SheetProps>>(function Sheet(
  {
    snapPoints,
    dismissOnBackdrop = true,
    onDismiss,
    enablePanDownToClose = true,
    keyboardBehavior = 'interactive',
    testID,
    children,
  },
  ref,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={1}
        pressBehavior={dismissOnBackdrop ? 'close' : 'none'}
        style={[props.style, { backgroundColor: colors.overlay }]}
      />
    ),
    [colors.overlay, dismissOnBackdrop],
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      keyboardBehavior={keyboardBehavior}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      style={styles.shadow}
    >
      <BottomSheetView
        testID={testID}
        style={[styles.content, { paddingBottom: insets.bottom + styles.content.paddingTop }]}
      >
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const useStyles = makeStyles((t) => ({
  background: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: t.radii.xl,
    borderTopRightRadius: t.radii.xl,
  },
  handle: { backgroundColor: t.colors.borderStrong, width: t.sizes.sheetHandle },
  shadow: { ...t.shadows.lg },
  content: { paddingHorizontal: t.spacing.xl, paddingTop: t.spacing.lg, gap: t.spacing.lg },
}));
