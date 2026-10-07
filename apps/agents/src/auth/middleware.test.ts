import { SignJWT } from 'jose';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_EXPIRES_IN,
  AGENT_TOKEN_ISSUER,
} from '@repo/schemas';

import { testEnv } from '../test/env';
import { agentAuth, type AgentAuthVariables } from './middleware';

const payload = {
  sub: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
};

async function bearer(secret: string) {
  const token = await new SignJWT({
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

  return `Bearer ${token}`;
}

function protectedApp(secret: string) {
  const app = new Hono();
  const runs = new Hono<{ Variables: AgentAuthVariables }>();
  runs.use('*', agentAuth(secret));
  runs.get('/', (c) => c.json({ runId: c.get('agentToken').runId }));
  app.route('/runs', runs);
  return app;
}

describe('agentAuth', () => {
  it('rejects a missing bearer token', async () => {
    const res = await protectedApp(testEnv().AGENT_JWT_SECRET).request('/runs');

    expect(res.status).toBe(401);
  });

  it('rejects a garbage token', async () => {
    const res = await protectedApp(testEnv().AGENT_JWT_SECRET).request(
      '/runs',
      {
        headers: { Authorization: 'Bearer not-a-jwt' },
      }
    );

    expect(res.status).toBe(401);
  });

  it('accepts a valid token and exposes claims', async () => {
    const secret = testEnv().AGENT_JWT_SECRET;
    const res = await protectedApp(secret).request('/runs', {
      headers: { Authorization: await bearer(secret) },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ runId: payload.runId });
  });
});
