import { act, fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { ToastProvider, useToast } from '@/components/ui/Toast';
import { TOAST_DURATION_MS } from '@/constants/timeouts';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

function Trigger() {
  const toast = useToast();
  return (
    <Pressable
      testID="trigger"
      onPress={() => toast.show({ message: 'Ride requested', tone: 'success' })}
    >
      <Text>show</Text>
    </Pressable>
  );
}

function renderToast() {
  return renderWithTheme(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows a message and auto-dismisses', async () => {
    await renderToast();
    await fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Ride requested')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(TOAST_DURATION_MS + 1));
    expect(screen.queryByText('Ride requested')).toBeNull();
  });

  it('dismisses on tap', async () => {
    await renderToast();
    await fireEvent.press(screen.getByTestId('trigger'));
    await fireEvent.press(screen.getByTestId('toast'));
    expect(screen.queryByText('Ride requested')).toBeNull();
  });

  it('throws outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderWithTheme(<Trigger />)).rejects.toThrow(/ToastProvider/);
  });
});
