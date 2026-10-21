import { toRegisterInput } from '@/features/auth/utils/registerInput';
import { loginSchema, registerSchema, type RegisterFormValues } from '@/features/auth/schemas';

/** Field → first i18n message key from a failed parse. */
function errors(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  const out: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const field = String(issue.path[0]);
    out[field] ??= issue.message;
  }
  return out;
}

const validRegister: RegisterFormValues = {
  name: 'Rəşad',
  surname: "O'Neil-Məmmədov",
  phone: '50 123 45 67',
  email: 'rashad@example.az',
  password: 'secret1',
  confirmPassword: 'secret1',
};

describe('loginSchema', () => {
  it('requires email and password', () => {
    expect(errors(loginSchema.safeParse({ email: '', password: '' }))).toEqual({
      email: 'errors.validation.required',
      password: 'errors.validation.required',
    });
  });

  it('rejects an invalid email and trims a valid one', () => {
    expect(errors(loginSchema.safeParse({ email: 'nope', password: 'x' }))).toEqual({
      email: 'errors.validation.email',
    });
    const ok = loginSchema.safeParse({ email: '  a@b.az ', password: 'x' });
    expect(ok.success && ok.data.email).toBe('a@b.az');
  });
});

describe('registerSchema', () => {
  it('accepts valid az/ru/en names and a masked phone', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
    expect(registerSchema.safeParse({ ...validRegister, name: 'Анна' }).success).toBe(true);
  });

  it('rejects names with digits or symbols', () => {
    expect(errors(registerSchema.safeParse({ ...validRegister, surname: 'R2D2' }))).toEqual({
      surname: 'errors.validation.name',
    });
  });

  it('rejects invalid phones', () => {
    expect(errors(registerSchema.safeParse({ ...validRegister, phone: '12 345 67 89' }))).toEqual({
      phone: 'errors.validation.phone',
    });
    expect(errors(registerSchema.safeParse({ ...validRegister, phone: '50 12' }))).toEqual({
      phone: 'errors.validation.phone',
    });
  });

  it('enforces password length and confirmation', () => {
    expect(
      errors(
        registerSchema.safeParse({ ...validRegister, password: '123', confirmPassword: '123' }),
      ),
    ).toEqual({ password: 'errors.validation.minLength' });
    expect(
      errors(registerSchema.safeParse({ ...validRegister, confirmPassword: 'different' })),
    ).toEqual({ confirmPassword: 'errors.validation.passwordsMismatch' });
  });

  it('maps form values to the register request with an E.164 phone', () => {
    const parsed = registerSchema.parse(validRegister);
    expect(toRegisterInput(parsed)).toEqual({
      name: 'Rəşad',
      surname: "O'Neil-Məmmədov",
      phoneNumber: '+994501234567',
      email: 'rashad@example.az',
      password: 'secret1',
    });
  });
});
