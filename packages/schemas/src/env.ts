import { z } from 'zod';

const OriginListSchema = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
  .pipe(z.array(z.url()).min(1));

export const AgentEnvSchema = z.object({
  // postgresSaver can use prepared statements and run its setup
  DATABASE_URL: z.url(),
  GOOGLE_API_KEY: z.string().min(1),
  AGENT_JWT_SECRET: z.string().min(32),
  WEB_ORIGIN: OriginListSchema,
  PORT: z.coerce.number().int().positive().default(8787),
});

export type AgentEnv = z.infer<typeof AgentEnvSchema>;

export function parseAgentEnv(source: Record<string, string | undefined>) {
  const result = AgentEnvSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid agent environment:\n${issues}`);
  }

  return result.data;
}
