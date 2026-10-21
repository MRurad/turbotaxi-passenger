import { z } from 'zod';

/** Signed-in passenger. Also persisted in AsyncStorage, hence the schema. */
export const userSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  surname: z.string(),
  phoneNumber: z.string(),
  email: z.string(),
  /** ISO timestamp, or null if the backend didn't send one. */
  createdAt: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;
