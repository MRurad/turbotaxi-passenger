import { onlineManager } from '@tanstack/react-query';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn() } }));

let shouldThrow = true;
function Bomb() {
  const [label] = useState('ok');
  if (shouldThrow) throw new Error('boom');
  return <Text>{label}</Text>;
}

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('ErrorBoundary', () => {
  it('shows the crash screen and restarts the tree', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    shouldThrow = true;
    await renderWithTheme(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('crash-screen')).toBeTruthy();

    shouldThrow = false;
    await fireEvent.press(screen.getByText('Restart'));
    expect(screen.getByText('ok')).toBeTruthy();
    consoleError.mockRestore();
  });
});

describe('OfflineBanner', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('appears while offline and goes away when back online', async () => {
    onlineManager.setOnline(true);
    await renderWithTheme(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).toBeNull();

    await act(async () => onlineManager.setOnline(false));
    expect(screen.getByTestId('offline-banner')).toBeTruthy();

    await act(async () => onlineManager.setOnline(true));
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });
});
