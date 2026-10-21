import { apiClient } from '@/api/client';
import { ENDPOINTS } from '@/api/endpoints';
import { unwrapEnvelope } from '@/api/errors';
import { mapAuthSession } from '@/api/mappers/auth';
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/api/types';
import type { AuthSession, LoginInput, RegisterInput } from '@/features/auth/types';

export async function login(input: LoginInput): Promise<AuthSession> {
  const body: LoginRequest = { email: input.email.trim(), password: input.password };
  const { data } = await apiClient.post<AuthResponse>(ENDPOINTS.auth.login, body);
  return mapAuthSession(unwrapEnvelope(data));
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
  return mapAuthSession(unwrapEnvelope(data));
}
