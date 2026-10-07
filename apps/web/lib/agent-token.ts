import { SignJWT } from 'jose';

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_EXPIRES_IN,
  AGENT_TOKEN_ISSUER,
  type AgentRunTokenPayload,
} from '@repo/schemas';

export async function mintAgentRunToken(
  payload: AgentRunTokenPayload,
  secret: string
) {
  return new SignJWT({
    runId: payload.runId,
    projectId: payload.projectId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(AGENT_TOKEN_ISSUER)
    .setAudience(AGENT_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(AGENT_TOKEN_EXPIRES_IN)
    .sign(new TextEncoder().encode(secret));
}
