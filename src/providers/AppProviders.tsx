import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { ThemeProvider } from '@/theme';

import { NavigationThemeProvider } from './NavigationThemeProvider';
import { createQueryClient } from './queryClient';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationThemeProvider>
            <QueryClientProvider client={queryClient}>
              {/* Toast wraps the sheet host so toasts paint above open sheets. */}
              <ToastProvider>
                <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
              </ToastProvider>
            </QueryClientProvider>
          </NavigationThemeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
