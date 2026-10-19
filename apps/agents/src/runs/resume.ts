import { randomUUID } from 'node:crypto'

import { Command, isGraphInterrupt } from '@langchain/langgraph'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

import { ResumeRunBodySchema } from '@repo/schemas'

import type { AgentAuthVariables } from '../auth/middleware'
import {
  asMessageChunk,
  createLangGraphAgUiMapper,
  writeEvent,
} from '../agui/from-langgraph'
import type { createAnalystGraph } from '../graphs/analyst'
import type { createRunStore } from './persist'

type AgentRuntime = {
  graph: ReturnType<typeof createAnalystGraph>
  runs: ReturnType<typeof createRunStore>
}

// Hono request that already passed the JWT check, so agentToken is set.
type RunContext = Context<{ Variables: AgentAuthVariables }>

// POST /runs/:id/resume continues a graph that hit interrupt()
export function resumeRun(c: RunContext, runtime: AgentRuntime) {
  // Read the JSON body. If it is not JSON, treat it as empty.
  return c.req
    .json()
    .catch(() => null)
    .then(async (body) => {
      // approved must be a boolean so we know whether to finish or reject.
      const parsed = ResumeRunBodySchema.safeParse(body)

      if (!parsed.success) {
        return c.json({ error: 'Invalid body' }, 400)
      }

      // Claims from the Bearer token which project and run to continue.
      const token = c.get('agentToken')
      const approved = parsed.data.approved

      if (c.req.param('id') !== token.runId) {
        return c.json({ error: 'Run not found' }, 404)
      }

      const status = await runtime.runs.status(token.runId)
      if (status !== 'awaiting_approval') {
        return c.json({ error: 'This run is not waiting for approval' }, 409)
      }

      // One mapper for this resume. threadId is still the conversation (project).
      const mapper = createLangGraphAgUiMapper({
        threadId: token.projectId,
        runId: token.runId,
        messageId: randomUUID(),
      })

      // Keep the HTTP connection open and push events as they happen.
      return streamSSE(c, async (stream) => {
        try {
          // Wrap approved so false is not treated as an empty Command
          const graphStream = await runtime.graph.stream(
            new Command({ resume: { approved } }),
            {
              streamMode: ['messages', 'updates'],
              configurable: { thread_id: token.projectId },
            }
          )

          // Skip non-message chunks then map tokens the same way as a new run.
          for await (const chunk of graphStream) {
            const messageChunk = asMessageChunk(chunk)
            if (!messageChunk) {
              continue
            }

            for (const event of mapper.onChunk(messageChunk)) {
              await writeEvent(stream, event)
            }
          }

          // Rejected scope is a failed run not a finished analysis.
          if (!approved) {
            await runtime.runs.markFailed(token.runId)
            await writeEvent(stream, mapper.error('Scope rejected'))
            return
          }

          await runtime.runs.markCompleted(token.runId)

          // Close the message if we opened one and tell the browser we are done.
          for (const event of mapper.end()) {
            await writeEvent(stream, event)
          }
        } catch (error) {
          // The graph paused again so keep the run waiting for another decision.
          if (isGraphInterrupt(error)) {
            await runtime.runs.markAwaitingApproval(token.runId)
            return
          }

          console.error(error)
          await runtime.runs.markFailed(token.runId).catch(() => undefined)
          await writeEvent(stream, mapper.error('Could not resume the run'))
        }
      })
    })
}
