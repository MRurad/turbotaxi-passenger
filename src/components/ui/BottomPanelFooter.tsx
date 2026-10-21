import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { createContext, useContext, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { makeStyles } from '@/theme';

export interface BottomPanelFooterValue {
  content: ReactNode;
  paddingBottom: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

export const BottomPanelFooterContext = createContext<BottomPanelFooterValue | null>(null);

/**
 * gorhom renders `footerComponent` as a component type (`<FooterComponent />`), so it must keep
 * one identity: a new function per render would remount the footer (and refire its queries)
 * every time. The content comes in through context instead.
 */
export function BottomPanelFooter(props: BottomSheetFooterProps) {
  const styles = useStyles();
  const value = useContext(BottomPanelFooterContext);
  if (!value) return null;
  return (
    <BottomSheetFooter {...props}>
      <View
        style={[styles.footer, { paddingBottom: value.paddingBottom }]}
        onLayout={value.onLayout}
      >
        {value.content}
      </View>
    </BottomSheetFooter>
  );
}

const useStyles = makeStyles((t) => ({
  footer: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.md,
    backgroundColor: t.colors.surfaceElevated,
    borderTopWidth: t.sizes.border,
    borderTopColor: t.colors.border,
  },
}));
