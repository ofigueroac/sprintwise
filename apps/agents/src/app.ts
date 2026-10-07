import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AgentEnv } from '@repo/schemas';

import { agentAuth, type AgentAuthVariables } from './auth/middleware';
import type { createAnalystGraph } from './graphs/analyst';

export type AgentRuntime = {
  graph: ReturnType<typeof createAnalystGraph>;
};

export function createApp(env: AgentEnv, _runtime?: AgentRuntime) {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: env.WEB_ORIGIN,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
    })
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  const runs = new Hono<{ Variables: AgentAuthVariables }>();
  runs.use('*', agentAuth(env.AGENT_JWT_SECRET));
  app.route('/runs', runs);

  return app;
}

export type AgentApp = ReturnType<typeof createApp>;
