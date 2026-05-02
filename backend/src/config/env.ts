import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().email('FIREBASE_CLIENT_EMAIL must be a valid email'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  GOOGLE_PLACES_API_KEY: z.string().min(1, 'GOOGLE_PLACES_API_KEY is required'),
  RSA_PRIVATE_KEY_B64: z.string().min(1, 'RSA_PRIVATE_KEY_B64 is required'),
  CORS_ORIGIN: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function loadEnv(): Env {
  /** Parses and caches all environment variables using the Zod schema. Must be called once at
   *  startup. If any variable is missing or malformed, it throws immediately with a formatted
   *  list of validation failures — preventing the server from booting with bad config. */
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Environment validation failed:\n${formatted}`);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  /** Returns the previously validated Env object. Throws if loadEnv() has not been called yet,
   *  ensuring no code ever reads environment values before they are validated. */
  if (!_env) throw new Error('Environment not loaded. Call loadEnv() first.');
  return _env;
}
