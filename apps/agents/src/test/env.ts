import { parseAgentEnv, type AgentEnv } from '@repo/schemas';

const defaults = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/sprintwise',
  GOOGLE_API_KEY: 'test-google-api-key',
  AGENT_JWT_SECRET: 'test-agent-jwt-secret-at-least-32-chars',
  WEB_ORIGIN: 'http://localhost:3000',
  PORT: '8787',
} satisfies Record<string, string>;

export function testEnv(overrides: Partial<typeof defaults> = {}): AgentEnv {
  return parseAgentEnv({ ...defaults, ...overrides });
}
