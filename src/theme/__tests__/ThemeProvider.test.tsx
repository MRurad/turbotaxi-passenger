import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import * as ReactNative from 'react-native';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { useThemeMode } from '@/theme/useTheme';

function Probe() {
  const { mode, isDark, isReady, setMode } = useThemeMode();
  return (
    <Pressable testID="go-dark" onPress={() => setMode('dark')}>
      <Text testID="probe">{`${mode}:${isDark ? 'dark' : 'light'}:${isReady}`}</Text>
    </Pressable>
  );
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('follows the system scheme in system mode', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('system:dark:true'));
  });

  it('restores a persisted mode', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'dark');
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('dark:dark:true'));
  });

  it('ignores an invalid stored value', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.themeMode, 'purple');
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('system:light:true'));
  });

  it('setMode switches and persists', async () => {
    await renderProvider();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent(/:true$/));
    await fireEvent.press(screen.getByTestId('go-dark'));
    expect(screen.getByTestId('probe')).toHaveTextContent('dark:dark:true');
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(STORAGE_KEYS.themeMode)).toBe('dark'),
    );
  });
});
