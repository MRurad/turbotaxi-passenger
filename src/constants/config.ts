import { z } from 'zod';

/** The production backend; used by a release build whose EXPO_PUBLIC_API_URL is missing. */
const DEFAULT_API_URL = 'https://api.turbotaxi.deepcode.az';

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

/**
 * Runs at import time, before React (and its error boundary) exists: a throw here kills a
 * release app on launch. So only development fails loudly; a release build missing a value
 * (e.g. an EAS build without its environment variables, docs/BUILD.md) falls back: the
 * production API, and no Google key (the map falls back to Apple Maps on iOS, place search
 * uses Photon).
 */
function loadConfig(): AppConfig {
  const result = envSchema.safeParse(rawEnv);
  if (result.success) return Object.freeze(result.data);
  const problems = result.error.issues.map((issue) => `  - ${issue.message}`).join('\n');
  if (__DEV__) {
    throw new Error(
      `Invalid environment configuration:\n${problems}\n\n` +
        'Copy .env.example to .env, fill in the values, then restart with `npx expo start -c`.',
    );
  }
  const apiUrl = envSchema.shape.API_URL.safeParse(rawEnv.API_URL);
  return Object.freeze({
    API_URL: apiUrl.success ? apiUrl.data : DEFAULT_API_URL,
    GOOGLE_MAPS_API_KEY: rawEnv.GOOGLE_MAPS_API_KEY ?? '',
  });
}

export const config = loadConfig();
