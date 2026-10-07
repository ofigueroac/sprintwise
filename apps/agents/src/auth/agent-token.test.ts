import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_EXPIRES_IN,
  AGENT_TOKEN_ISSUER,
} from '@repo/schemas';

import { testEnv } from '../test/env';
import { verifyAgentRunToken } from './agent-token';

const payload = {
  sub: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
};

async function mint(
  secret: string,
  expiresIn: string | number = AGENT_TOKEN_EXPIRES_IN
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
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

describe('verifyAgentRunToken', () => {
  it('accepts a token minted by the web app', async () => {
    const secret = testEnv().AGENT_JWT_SECRET;
    const token = await mint(secret);

    await expect(verifyAgentRunToken(token, secret)).resolves.toEqual(payload);
  });

  it('rejects an expired token', async () => {
    const secret = testEnv().AGENT_JWT_SECRET;
    const token = await mint(secret, Math.floor(Date.now() / 1000) - 10);

    await expect(verifyAgentRunToken(token, secret)).rejects.toThrow();
  });
});
