import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).refine(
    (v) =>
      v.startsWith('pglite://') ||
      v.startsWith('postgres://') ||
      v.startsWith('postgresql://'),
    { message: "Ha de començar per 'pglite://', 'postgres://' o 'postgresql://'" },
  ),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().nonnegative().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3001'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n  - ');
    throw new Error(`Configuració d'entorn invàlida:\n  - ${issues}`);
  }
  return parsed.data;
}
