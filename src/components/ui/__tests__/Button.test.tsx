import { fireEvent, screen } from '@testing-library/react-native';

import { Button } from '@/components/ui/Button';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

describe('Button', () => {
  it('calls onPress and exposes its label to screen readers', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Request ride" onPress={onPress} testID="btn" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Request ride' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Go" onPress={onPress} disabled testID="btn" />);
    const button = screen.getByTestId('btn');
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('shows a spinner and is busy while loading', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button label="Go" onPress={onPress} loading testID="btn" />, 'dark');
    await fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('btn-spinner')).toBeTruthy();
    expect(screen.getByTestId('btn')).toBeBusy();
  });
});

describe('Button value', () => {
  it('renders a trailing value and includes it in the a11y label', async () => {
    await renderWithTheme(<Button label="Order Comfort" value="8.40 ₼" onPress={jest.fn()} />);
    expect(screen.getByText('8.40 ₼')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Order Comfort, 8.40 ₼' })).toBeTruthy();
  });
});
