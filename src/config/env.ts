import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  CORS_ORIGIN: z.string().default('*'),
  // Opcional: sem RabbitMQ, os eventos são processados em memória
  RABBITMQ_URL: z.string().optional(),
  RABBITMQ_QUEUE: z.string().default('inventory.stock-alerts'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${detalhes}`);
  }
  return parsed.data;
}
