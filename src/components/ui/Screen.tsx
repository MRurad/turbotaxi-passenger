import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme';

export interface ScreenProps {
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** Push content above the keyboard (forms). */
  keyboardAvoiding?: boolean;
  /** Apply the standard horizontal padding. Default true. */
  padded?: boolean;
  /** Safe-area edges to inset. Default: top + bottom (left/right too on landscape). */
  edges?: Edge[];
  /** Rendered above the content, outside the scroll area (e.g. <Header />). */
  header?: ReactNode;
  /** Pinned to the bottom, outside the scroll area (e.g. primary action). */
  footer?: ReactNode;
  background?: 'background' | 'surface';
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const DEFAULT_EDGES: Edge[] = ['top', 'bottom', 'left', 'right'];

export function Screen({
  scroll = false,
  keyboardAvoiding = false,
  padded = true,
  edges = DEFAULT_EDGES,
  header,
  footer,
  background = 'background',
  contentStyle,
  testID,
  children,
}: PropsWithChildren<ScreenProps>) {
  const styles = useStyles();
  const inner = [padded && styles.padded, contentStyle];

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, inner]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, inner]}>{children}</View>
  );

  return (
    <SafeAreaView testID={testID} edges={edges} style={[styles.flex, styles[background]]}>
      {header}
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      ) : (
        <>
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  background: { backgroundColor: t.colors.background },
  surface: { backgroundColor: t.colors.surface },
  padded: { paddingHorizontal: t.spacing.xl },
  scrollContent: { flexGrow: 1, paddingBottom: t.spacing.xxl },
  footer: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.lg,
  },
}));
