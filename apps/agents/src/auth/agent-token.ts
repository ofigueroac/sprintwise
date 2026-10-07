import { jwtVerify } from 'jose';

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_ISSUER,
  AgentRunTokenPayloadSchema,
} from '@repo/schemas';

export async function verifyAgentRunToken(token: string, secret: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    issuer: AGENT_TOKEN_ISSUER,
    audience: AGENT_TOKEN_AUDIENCE,
    algorithms: ['HS256'],
  });

  return AgentRunTokenPayloadSchema.parse({
    sub: payload.sub,
    runId: payload.runId,
    projectId: payload.projectId,
  });
}
