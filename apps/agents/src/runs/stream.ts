import { randomUUID } from 'node:crypto'

import { HumanMessage } from '@langchain/core/messages'
import { INTERRUPT, isGraphInterrupt } from '@langchain/langgraph'
import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'

import { CreateRunBodySchema } from '@repo/schemas'

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

function analystMessage(chunk: unknown): object | null {
  if (!Array.isArray(chunk) || chunk[0] !== 'updates') {
    return null
  }

  const update = chunk[1]
  if (!update || typeof update !== 'object' || !('analyst' in update)) {
    return null
  }

  const analyst = update.analyst
  if (!analyst || typeof analyst !== 'object' || !('messages' in analyst)) {
    return null
  }

  const { messages } = analyst
  if (!Array.isArray(messages) || messages.length === 0) {
    return null
  }

  const message = messages.at(-1)
  return message && typeof message === 'object' ? message : null
}

function hasInterrupt(chunk: unknown) {
  if (!Array.isArray(chunk) || chunk.length === 0) {
    return false
  }

  const payload = chunk[0] === 'updates' ? chunk[1] : chunk[0]
  return Boolean(payload && typeof payload === 'object' && INTERRUPT in payload)
}

async function isRunPaused(graph: AgentRuntime['graph'], projectId: string) {
  const snapshot = await graph.getState({
    configurable: { thread_id: projectId },
  })
  return snapshot.tasks.some((task) => task.interrupts.length > 0)
}

async function pauseRun(
  runtime: AgentRuntime,
  mapper: ReturnType<typeof createLangGraphAgUiMapper>,
  runId: string
) {
  await runtime.runs.markAwaitingApproval(runId)
  return mapper.closeMessage()
}

// POST /runs: save the idea, ask the Analyst, stream tokens to the browser.
export function streamRun(c: RunContext, runtime: AgentRuntime) {
  // Read the JSON body. If it is not JSON, treat it as empty.
  return c.req
    .json()
    .catch(() => null)
    .then(async (body) => {
      // idea must be a non-empty string, max 8000 characters.
      const parsed = CreateRunBodySchema.safeParse(body)

      if (!parsed.success) {
        return c.json({ error: 'Invalid body' }, 400)
      }

      // Claims from the Bearer token: who the user is, which project, which run.
      const token = c.get('agentToken')
      const idea = parsed.data.idea

      // One mapper for this turn. threadId is the conversation (project).
      const mapper = createLangGraphAgUiMapper({
        threadId: token.projectId,
        runId: token.runId,
        messageId: randomUUID(),
      })

      // Save the project, the run row, and the user's idea before streaming.
      // False means this run already has a user message, so do not start again.
      const started = await runtime.runs.recordUserTurn({
        userId: token.sub,
        projectId: token.projectId,
        runId: token.runId,
        idea,
      })

      if (!started) {
        return c.json({ error: 'Run already started' }, 409)
      }

      // Keep the HTTP connection open and push events as they happen.
      return streamSSE(c, async (stream) => {
        // Full assistant text, built from every TEXT_MESSAGE_CONTENT delta.
        let assistantText = ''

        try {
          // Tell the browser the run has started.
          await writeEvent(stream, mapper.start())

          // Start the Analyst graph. Checkpoints key off projectId.
          const graphStream = await runtime.graph.stream(
            { messages: [new HumanMessage(idea)] },
            {
              streamMode: ['messages', 'updates'],
              configurable: { thread_id: token.projectId },
            }
          )

          let paused = false

          // Each chunk is one piece of the model reply (or noise we skip).
          for await (const chunk of graphStream) {
            if (hasInterrupt(chunk)) {
              paused = true
              break
            }

            const messageChunk = asMessageChunk(chunk)
            const finished = analystMessage(chunk)
            const events = messageChunk
              ? mapper.onChunk(messageChunk)
              : finished
                ? mapper.tools(finished)
                : []

            if (events.length === 0) {
              continue
            }

            for (const event of events) {
              // Remember the words so we can save the full reply at the end.
              if (event.type === 'TEXT_MESSAGE_CONTENT') {
                assistantText += event.delta
              }

              await writeEvent(stream, event)
            }
          }

          // Save the full assistant message if we got any text.
          if (assistantText) {
            await runtime.runs.recordAssistantMessage(
              token.runId,
              assistantText
            )
          }

          if (paused || (await isRunPaused(runtime.graph, token.projectId))) {
            for (const event of await pauseRun(runtime, mapper, token.runId)) {
              await writeEvent(stream, event)
            }
            return
          }

          // Mark the run as done in the database.
          await runtime.runs.markCompleted(token.runId)

          // Close the message (if we opened one) and send RUN_FINISHED.
          for (const event of mapper.end()) {
            await writeEvent(stream, event)
          }
        } catch (error) {
          if (isGraphInterrupt(error)) {
            for (const event of await pauseRun(runtime, mapper, token.runId)) {
              await writeEvent(stream, event)
            }
            return
          }

          // Something failed model, database, or mapping
          console.error(error)
          await runtime.runs.markFailed(token.runId).catch(() => undefined)

          // Tell the browser the run failed. Do not send RUN_FINISHED after this.
          await writeEvent(stream, mapper.error('The Analyst run failed'))
        }
      })
    })
}
