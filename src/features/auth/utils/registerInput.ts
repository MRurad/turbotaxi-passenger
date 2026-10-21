import type { RegisterFormValues } from '../schemas';
import type { RegisterInput } from '../types';
import { toE164 } from './phone';

/** Register form values → API input (phone as +994XXXXXXXXX). */
export function toRegisterInput(values: RegisterFormValues): RegisterInput {
  return {
    name: values.name,
    surname: values.surname,
    phoneNumber: toE164(values.phone),
    email: values.email,
    password: values.password,
  };
}
