import { serve } from '@hono/node-server'

import { createDb } from '@repo/db'
import { parseAgentEnv } from '@repo/schemas'

import { createApp } from './app'
import { createCheckpointer } from './checkpointer'
import { createAnalystGraph } from './graphs/analyst'
import { createFakeAnalystModel } from './llm/fake'
import { createGeminiModel } from './llm/gemini'
import { createRunStore } from './runs/persist'

const env = parseAgentEnv(process.env)

const db = createDb(env.DATABASE_URL)
const runStore = createRunStore(db)

const checkpointer = createCheckpointer(env.DATABASE_URL)
await checkpointer.setup()

const model = env.FAKE_LLM
  ? createFakeAnalystModel()
  : createGeminiModel(env.GOOGLE_API_KEY ?? '')

const graph = createAnalystGraph(model, checkpointer, (projectId, args) =>
  runStore.saveKanbanStories(projectId, args)
)

const server = serve(
  { fetch: createApp(env, { graph, runs: runStore }).fetch, port: env.PORT },
  (info) => {
    const mode = env.FAKE_LLM ? 'fake Analyst' : 'Gemini'
    console.log(`agents listening on http://localhost:${info.port} (${mode})`)
  }
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
  })
}
