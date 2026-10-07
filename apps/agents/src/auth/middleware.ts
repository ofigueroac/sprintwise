import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { AgentRunTokenPayload } from '@repo/schemas';

import { verifyAgentRunToken } from './agent-token';

export type AgentAuthVariables = {
  agentToken: AgentRunTokenPayload;
};

export function agentAuth(secret: string) {
  return createMiddleware<{ Variables: AgentAuthVariables }>(
    async (c, next) => {
      const header = c.req.header('Authorization');

      if (!header?.startsWith('Bearer ')) {
        throw new HTTPException(401, { message: 'Missing bearer token' });
      }

      try {
        c.set(
          'agentToken',
          await verifyAgentRunToken(header.slice('Bearer '.length), secret)
        );
      } catch {
        throw new HTTPException(401, {
          message: 'Invalid or expired token',
        });
      }

      await next();
    }
  );
}
