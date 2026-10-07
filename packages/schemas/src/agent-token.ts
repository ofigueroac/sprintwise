import { z } from 'zod';

export const AGENT_TOKEN_ISSUER = 'sprintwise-web';
export const AGENT_TOKEN_AUDIENCE = 'sprintwise-agents';
export const AGENT_TOKEN_EXPIRES_IN = '60s';

export const AgentRunTokenPayloadSchema = z.object({
  sub: z.uuid(),
  runId: z.uuid(),
  projectId: z.uuid(),
});

export type AgentRunTokenPayload = z.infer<typeof AgentRunTokenPayloadSchema>;
