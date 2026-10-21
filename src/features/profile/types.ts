export interface UpdateProfileInput {
  name: string;
  surname: string;
  /** E.164, e.g. +994501234567. */
  phoneNumber: string;
  email: string;
}
