import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiError, unwrapEnvelope } from '@/api/errors';
import { mapAuthSession } from '@/api/mappers/auth';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/api/types';
import type { AuthSession, LoginInput, RegisterInput } from '@/features/auth/types';
import { describeShape, logger } from '@/lib/logger';

export async function login(input: LoginInput): Promise<AuthSession> {
  const body: LoginRequest = { email: input.email.trim(), password: input.password };
  const { data } = await apiClient.post<AuthResponse>(ENDPOINTS.auth.login, body);
  return mapAuthSession(unwrapEnvelope(data));
}

/**
 * Session from a successful register response, or null if it doesn't contain one
 * (no tokens / user). An explicit `{ success:false }` still throws — that's a real failure
 * such as "email already registered".
 */
function sessionFromRegister(data: AuthResponse | null | undefined): AuthSession | null {
  if (data?.success === false) unwrapEnvelope(data);
  try {
    return mapAuthSession(unwrapEnvelope(data));
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    logger.warn('register: 2xx without a usable session; logging in instead', {
      reason: error.serverMessage ?? error.code,
      shape: describeShape(data, 3),
    });
    return null;
  }
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const body: RegisterRequest = {
    name: input.name.trim(),
    surname: input.surname.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email.trim(),
    password: input.password,
  };
  const { data } = await apiClient.post<AuthResponse>(ENDPOINTS.auth.register, body);
  // The account exists at this point (HTTP 2xx). If the backend didn't return tokens
  // (docs/BACKEND_REQUESTS.md #22), sign in with the same credentials.
  return sessionFromRegister(data) ?? login({ email: body.email ?? '', password: input.password });
}
