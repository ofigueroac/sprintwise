import { Hono } from 'hono';
import { cors } from 'hono/cors';

import type { AgentEnv } from '@repo/schemas';

import { agentAuth, type AgentAuthVariables } from './auth/middleware';
import type { createAnalystGraph } from './graphs/analyst';
import type { createRunStore } from './runs/persist';
import { streamRun } from './runs/stream';

export type AgentRuntime = {
  graph: ReturnType<typeof createAnalystGraph>;
  runs: ReturnType<typeof createRunStore>;
};

export function createApp(env: AgentEnv, runtime?: AgentRuntime) {
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
  // Auth only on POST so the browser OPTIONS preflight is not asked for a token.
  runs.post('/', agentAuth(env.AGENT_JWT_SECRET), (c) => {
    if (!runtime) {
      return c.json({ error: 'Agent graph is not ready' }, 503);
    }

    return streamRun(c, runtime);
  });
  app.route('/runs', runs);

  return app;
}

export type AgentApp = ReturnType<typeof createApp>;
