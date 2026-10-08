import { serve } from '@hono/node-server';

import { createDb } from '@repo/db';
import { parseAgentEnv } from '@repo/schemas';

import { createApp } from './app';
import { createCheckpointer } from './checkpointer';
import { createAnalystGraph } from './graphs/analyst';
import { createGeminiModel } from './llm/gemini';
import { createRunStore } from './runs/persist';

const env = parseAgentEnv(process.env);

const db = createDb(env.DATABASE_URL);
const runStore = createRunStore(db);

const checkpointer = createCheckpointer(env.DATABASE_URL);
await checkpointer.setup();

const graph = createAnalystGraph(
  createGeminiModel(env.GOOGLE_API_KEY),
  checkpointer
);

const server = serve(
  { fetch: createApp(env, { graph, runs: runStore }).fetch, port: env.PORT },
  (info) => {
    console.log(`agents listening on http://localhost:${info.port}`);
  }
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
