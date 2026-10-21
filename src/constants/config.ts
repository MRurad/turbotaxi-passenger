import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.url({ message: 'EXPO_PUBLIC_API_URL must be a valid URL' }),
  GOOGLE_MAPS_API_KEY: z
    .string({ message: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is missing' })
    .min(1, { message: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is empty' }),
});

export type AppConfig = z.infer<typeof envSchema>;

// Expo only inlines EXPO_PUBLIC_* vars accessed statically (process.env.NAME), so no destructuring.
const rawEnv = {
  API_URL: process.env.EXPO_PUBLIC_API_URL,
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
};

function loadConfig(): AppConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.message}`).join('\n');
    throw new Error(
      `Invalid environment configuration:\n${problems}\n\n` +
        'Copy .env.example to .env, fill in the values, then restart with `npx expo start -c`.',
    );
  }
  return Object.freeze(result.data);
}

export const config = loadConfig();
