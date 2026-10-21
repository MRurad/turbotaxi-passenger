import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModalProps,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import { BackHandler, useWindowDimensions } from 'react-native';
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
  /** Long content (lists) scrolls inside a capped sheet. */
  scrollable?: boolean;
  testID?: string;
}

/** Modal sheets never cover more than this share of the screen. */
const MAX_SHEET_HEIGHT_RATIO = 0.8;

/**
 * Themed modal bottom sheet. Must be rendered under BottomSheetModalProvider (AppProviders).
 * Android back closes the sheet while it's open (gorhom doesn't handle back itself).
 */
export const Sheet = forwardRef<SheetRef, PropsWithChildren<SheetProps>>(function Sheet(
  {
    snapPoints,
    dismissOnBackdrop = true,
    onDismiss,
    enablePanDownToClose = true,
    keyboardBehavior = 'interactive',
    scrollable = false,
    testID,
    children,
  },
  forwardedRef,
) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const innerRef = useRef<SheetRef | null>(null);
  const [open, setOpen] = useState(false);

  const setRefs = useCallback(
    (instance: SheetRef | null) => {
      innerRef.current = instance;
      if (typeof forwardedRef === 'function') forwardedRef(instance);
      else if (forwardedRef) forwardedRef.current = instance;
    },
    [forwardedRef],
  );

  // Registered while open, i.e. after any screen-level handler: it runs first.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      innerRef.current?.dismiss();
      return true;
    });
    return () => sub.remove();
  }, [open]);

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

  const contentStyle = [
    styles.content,
    { paddingBottom: insets.bottom + styles.content.paddingTop },
  ];

  return (
    <BottomSheetModal
      ref={setRefs}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      maxDynamicContentSize={windowHeight * MAX_SHEET_HEIGHT_RATIO}
      enablePanDownToClose={enablePanDownToClose}
      keyboardBehavior={keyboardBehavior}
      onChange={(index) => setOpen(index >= 0)}
      onDismiss={() => {
        setOpen(false);
        onDismiss?.();
      }}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
      style={styles.shadow}
    >
      {scrollable ? (
        <BottomSheetScrollView testID={testID} contentContainerStyle={contentStyle}>
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView testID={testID} style={contentStyle}>
          {children}
        </BottomSheetView>
      )}
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
