import { AIMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { MemorySaver } from '@langchain/langgraph'
import { SignJWT } from 'jose'
import { describe, expect, it, vi } from 'vitest'

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_EXPIRES_IN,
  AGENT_TOKEN_ISSUER,
  AgUiEventSchema,
  type AgUiEvent,
} from '@repo/schemas'

import { createApp } from '../app'
import { createAnalystGraph } from '../graphs/analyst'
import { testEnv } from '../test/env'
import type { createRunStore } from './persist'

const ids = {
  sub: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
}

function memoryRuns(): ReturnType<typeof createRunStore> {
  return {
    async recordUserTurn() {
      return true
    },
    async recordAssistantMessage() {},
    async markCompleted() {},
    async markFailed() {},
    async saveKanbanStories() {},
    async markAwaitingApproval() {},
  }
}

async function bearer(secret: string) {
  const token = await new SignJWT({
    runId: ids.runId,
    projectId: ids.projectId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(ids.sub)
    .setIssuer(AGENT_TOKEN_ISSUER)
    .setAudience(AGENT_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(AGENT_TOKEN_EXPIRES_IN)
    .sign(new TextEncoder().encode(secret))

  return `Bearer ${token}`
}

function eventsFromSse(body: string): AgUiEvent[] {
  return body
    .split('\n\n')
    .map((frame) => {
      const line = frame.split('\n').find((row) => row.startsWith('data: '))

      if (!line) {
        return null
      }

      return AgUiEventSchema.parse(JSON.parse(line.slice('data: '.length)))
    })
    .filter((event): event is AgUiEvent => event !== null)
}

function kanbanModel() {
  return {
    bindTools() {
      return this
    },
    async stream() {
      return (async function* () {
        yield new AIMessage({
          content: 'Here is the analysis.',
          tool_calls: [
            {
              id: 'call-1',
              name: 'render_kanban',
              args: {
                cards: [
                  { title: 'Book a walk' },
                  { title: 'Pay online' },
                  { title: 'Leave a review' },
                ],
              },
              type: 'tool_call',
            },
          ],
        })
      })()
    },
  } as unknown as BaseChatModel
}

async function pauseThenResume(
  runs: ReturnType<typeof createRunStore>,
  approved: boolean
) {
  const env = testEnv()
  const app = createApp(env, {
    graph: createAnalystGraph(
      kanbanModel(),
      new MemorySaver(),
      async () => undefined
    ),
    runs,
  })
  const headers = {
    Authorization: await bearer(env.AGENT_JWT_SECRET),
    'Content-Type': 'application/json',
  }

  // Same graph and checkpointer so resume can find the interrupt
  const paused = await app.request('/runs', {
    method: 'POST',
    headers,
    body: JSON.stringify({ idea: 'A dog walking app' }),
  })

  expect(paused.status).toBe(200)
  expect(
    eventsFromSse(await paused.text()).map((event) => event.type)
  ).not.toContain('RUN_FINISHED')

  return app.request(`/runs/${ids.runId}/resume`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ approved }),
  })
}

describe('POST /runs/:id/resume', () => {
  it('emits RUN_FINISHED when the user approves', async () => {
    const markCompleted = vi.fn(async () => undefined)
    const res = await pauseThenResume({ ...memoryRuns(), markCompleted }, true)

    expect(res.status).toBe(200)

    const events = eventsFromSse(await res.text())
    const types = events.map((event) => event.type)

    expect(types).not.toContain('RUN_STARTED')
    expect(types.at(-1)).toBe('RUN_FINISHED')
    expect(markCompleted).toHaveBeenCalledWith(ids.runId)
  })

  it('emits RUN_ERROR and skips RUN_FINISHED when the user rejects', async () => {
    const markFailed = vi.fn(async () => undefined)
    const res = await pauseThenResume({ ...memoryRuns(), markFailed }, false)

    expect(res.status).toBe(200)

    const events = eventsFromSse(await res.text())
    const types = events.map((event) => event.type)
    const failed = events.at(-1)

    expect(types).not.toContain('RUN_STARTED')
    expect(types).not.toContain('RUN_FINISHED')
    expect(failed).toMatchObject({
      type: 'RUN_ERROR',
      message: 'Scope rejected',
    })
    expect(markFailed).toHaveBeenCalledWith(ids.runId)
  })
})
