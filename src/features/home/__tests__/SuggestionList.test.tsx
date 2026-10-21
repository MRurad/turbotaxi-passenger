import { fireEvent, screen } from '@testing-library/react-native';

import { SuggestionList } from '@/features/home/components/SuggestionList';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

const SUGGESTIONS = [
  { placeId: 'p1', title: 'Port Baku Towers', subtitle: 'Neftchilar Ave' },
  { placeId: 'p2', title: 'Nizami St', subtitle: '' },
];

const base = { error: false, loading: false, busy: false, onRetry: jest.fn(), onSelect: jest.fn() };

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('SuggestionList', () => {
  it('renders suggestions with Google attribution and selects one', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <SuggestionList {...base} suggestions={SUGGESTIONS} onSelect={onSelect} />,
    );
    expect(screen.getByText('Powered by Google')).toBeTruthy();
    await fireEvent.press(screen.getByText('Port Baku Towers'));
    expect(onSelect).toHaveBeenCalledWith(SUGGESTIONS[0]);
  });

  it('shows the empty state', async () => {
    await renderWithTheme(<SuggestionList {...base} suggestions={[]} />);
    expect(screen.getByText('Nothing found')).toBeTruthy();
  });

  it('shows an error with retry', async () => {
    const onRetry = jest.fn();
    await renderWithTheme(<SuggestionList {...base} suggestions={[]} error onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('ignores taps while a pick is resolving', async () => {
    const onSelect = jest.fn();
    await renderWithTheme(
      <SuggestionList {...base} suggestions={SUGGESTIONS} onSelect={onSelect} busy />,
    );
    await fireEvent.press(screen.getByText('Nizami St'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
