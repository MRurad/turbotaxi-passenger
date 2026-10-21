import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { i18n } from '@/i18n';
import { renderWithTheme } from '@/test-utils/renderWithTheme';

beforeEach(() => i18n.changeLanguage('en'));
afterAll(() => i18n.changeLanguage('az'));

describe('LoginForm', () => {
  it('shows translated validation errors and does not submit when empty', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(<LoginForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(screen.getAllByText('This field is required')).toHaveLength(2));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(<LoginForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.changeText(screen.getByTestId('login-email'), ' r@x.az ');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'secret');
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'r@x.az', password: 'secret' }),
    );
  });

  it('shows the server error banner', async () => {
    await renderWithTheme(
      <LoginForm onSubmit={jest.fn()} submitting={false} errorMessage="Account is blocked" />,
    );
    expect(screen.getByTestId('login-error')).toHaveTextContent(/Account is blocked/);
  });
});

describe('RegisterForm', () => {
  it('masks the phone as the user types', async () => {
    await renderWithTheme(<RegisterForm onSubmit={jest.fn()} submitting={false} />);
    const phone = screen.getByTestId('register-phone');

    await fireEvent.changeText(phone, '+994501234567');
    expect(phone).toHaveDisplayValue('50 123 45 67');
  });

  it('reports a password mismatch on the confirm field', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(<RegisterForm onSubmit={onSubmit} submitting={false} />);

    await fireEvent.changeText(screen.getByTestId('register-name'), 'Rashad');
    await fireEvent.changeText(screen.getByTestId('register-surname'), 'Mammadov');
    await fireEvent.changeText(screen.getByTestId('register-phone'), '501234567');
    await fireEvent.changeText(screen.getByTestId('register-email'), 'r@x.az');
    await fireEvent.changeText(screen.getByTestId('register-password'), 'secret1');
    await fireEvent.changeText(screen.getByTestId('register-confirm'), 'secret2');
    await fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => expect(screen.getByText("Passwords don't match")).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('form edge cases', () => {
  it('ignores submit (button or keyboard "go") while a request is pending', async () => {
    const onSubmit = jest.fn();
    await renderWithTheme(<LoginForm onSubmit={onSubmit} submitting />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'r@x.az');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'secret');
    await fireEvent(screen.getByTestId('login-password'), 'submitEditing');
    await waitFor(() => expect(screen.getByTestId('login-password')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onEdit when a field changes (clears the server error)', async () => {
    const onEdit = jest.fn();
    await renderWithTheme(<LoginForm onSubmit={jest.fn()} submitting={false} onEdit={onEdit} />);
    await fireEvent.changeText(screen.getByTestId('login-email'), 'r');
    expect(onEdit).toHaveBeenCalled();
  });

  it('re-validates confirm when the password changes to match it', async () => {
    await renderWithTheme(<RegisterForm onSubmit={jest.fn()} submitting={false} />);
    await fireEvent.changeText(screen.getByTestId('register-password'), 'secret1');
    await fireEvent.changeText(screen.getByTestId('register-confirm'), 'secret2');
    await fireEvent(screen.getByTestId('register-confirm'), 'blur');
    await waitFor(() => expect(screen.getByText("Passwords don't match")).toBeTruthy());

    await fireEvent.changeText(screen.getByTestId('register-password'), 'secret2');
    await waitFor(() => expect(screen.queryByText("Passwords don't match")).toBeNull());
  });

  it('announces compact language chips by full name', async () => {
    await renderWithTheme(<LanguageSwitcher compact />);
    expect(screen.getByRole('radio', { name: 'Русский' })).toBeTruthy();
    expect(screen.getByText('RU')).toBeTruthy();
  });
});
