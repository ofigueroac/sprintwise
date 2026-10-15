import { randomUUID } from 'node:crypto'

import { Command, isGraphInterrupt } from '@langchain/langgraph'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

import {
  AgUiEventSchema,
  ResumeRunBodySchema,
  type AgUiEvent,
} from '@repo/schemas'

import type { AgentAuthVariables } from '../auth/middleware'
import {
  createLangGraphAgUiMapper,
  type LangGraphStreamChunk,
} from '../agui/from-langgraph'
import type { createAnalystGraph } from '../graphs/analyst'
import type { createRunStore } from './persist'

type AgentRuntime = {
  graph: ReturnType<typeof createAnalystGraph>
  runs: ReturnType<typeof createRunStore>
}

// Hono request that already passed the JWT check, so agentToken is set.
type RunContext = Context<{ Variables: AgentAuthVariables }>

// Check the event against our Zod union, then send it as one SSE frame.
async function writeEvent(
  stream: {
    writeSSE: (message: { event: string; data: string }) => Promise<void>
  },
  payload: AgUiEvent
) {
  const event = AgUiEventSchema.parse(payload)
  await stream.writeSSE({
    event: event.type,
    data: JSON.stringify(event),
  })
}

// Updates and other modes are ignored we only map assistant tokens.
function asMessageChunk(chunk: unknown): LangGraphStreamChunk | null {
  if (!Array.isArray(chunk) || chunk.length === 0) {
    return null
  }

  const payload = chunk[0] === 'messages' ? chunk[1] : chunk
  if (
    !Array.isArray(payload) ||
    payload.length < 2 ||
    typeof payload[0]?.getType !== 'function'
  ) {
    return null
  }

  return payload as unknown as LangGraphStreamChunk
}

// POST /runs/:id/resume continues a graph that hit interrupt()
export function resumeRun(c: RunContext, runtime: AgentRuntime) {
  // Read the JSON body. If it is not JSON, treat it as empty.
  return c.req
    .json()
    .catch(() => null)
    .then((body) => {
      // approved must be a boolean so we know whether to finish or reject.
      const parsed = ResumeRunBodySchema.safeParse(body)

      if (!parsed.success) {
        return c.json({ error: 'Invalid body' }, 400)
      }

      // Claims from the Bearer token which project and run to continue.
      const token = c.get('agentToken')
      const approved = parsed.data.approved

      // One mapper for this resume. threadId is still the conversation (project).
      const mapper = createLangGraphAgUiMapper({
        threadId: token.projectId,
        runId: token.runId,
        messageId: randomUUID(),
      })

      // Keep the HTTP connection open and push events as they happen.
      return streamSSE(c, async (stream) => {
        try {
          // Command resume unblocks waitForApproval with the user's yes or no.
          const graphStream = await runtime.graph.stream(
            new Command({ resume: approved }),
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

          await runtime.runs.markFailed(token.runId).catch(() => undefined)
          const message =
            error instanceof Error ? error.message : 'Could not resume the run'
          await writeEvent(stream, mapper.error(message))
        }
      })
    })
}
