import { AIMessage, AIMessageChunk } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { FakeListChatModel } from '@langchain/core/utils/testing'
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

const reply = 'Hello from the Analyst'

// Same shape as the real store, but it only keeps arrays in memory.
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

// SSE frames look like: event: NAME , data: {json}
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

describe('POST /runs', () => {
  it('streams RUN_STARTED, the fake reply, then RUN_FINISHED', async () => {
    const env = testEnv()

    // FakeListChatModel pretends to be Gemini and always returns `reply`.
    const app = createApp(env, {
      graph: createAnalystGraph(
        new FakeListChatModel({ responses: [reply] }),
        new MemorySaver()
      ),
      runs: memoryRuns(),
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    expect(res.status).toBe(200)

    const events = eventsFromSse(await res.text())
    const types = events.map((event) => event.type)
    const text = events
      .filter((event) => event.type === 'TEXT_MESSAGE_CONTENT')
      .map((event) => event.delta)
      .join('')

    expect(types[0]).toBe('RUN_STARTED')
    expect(types).toContain('TEXT_MESSAGE_START')
    expect(text).toBe(reply)
    expect(types.at(-1)).toBe('RUN_FINISHED')

    const started = events[0]
    expect(started?.type).toBe('RUN_STARTED')
    if (started?.type === 'RUN_STARTED') {
      expect(started.threadId).toBe(ids.projectId)
      expect(started.runId).toBe(ids.runId)
    }
  })

  it('returns 409 when this run already has a user message', async () => {
    const env = testEnv()
    const app = createApp(env, {
      graph: createAnalystGraph(new FakeListChatModel({ responses: [reply] })),
      runs: {
        ...memoryRuns(),
        async recordUserTurn() {
          return false
        },
      },
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    expect(res.status).toBe(409)
  })

  it('emits RUN_ERROR when the model throws', async () => {
    const env = testEnv()

    // stream() rejects so the graph never produces tokens
    const model = new FakeListChatModel({ responses: [reply] })
    model.stream = async () => {
      throw new Error('Gemini is down')
    }

    const app = createApp(env, {
      graph: createAnalystGraph(model),
      runs: memoryRuns(),
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    expect(res.status).toBe(200)

    const events = eventsFromSse(await res.text())
    const types = events.map((event) => event.type)
    const failed = events.at(-1)

    // The browser already got RUN_STARTED before the model ran
    expect(types[0]).toBe('RUN_STARTED')
    expect(types).not.toContain('RUN_FINISHED')
    expect(failed).toMatchObject({
      type: 'RUN_ERROR',
      message: 'Gemini is down',
    })
  })

  it('marks awaiting_approval and skips RUN_FINISHED after render_kanban', async () => {
    const env = testEnv()
    const markAwaitingApproval = vi.fn(async () => undefined)
    const model = {
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

    const app = createApp(env, {
      graph: createAnalystGraph(
        model,
        new MemorySaver(),
        async () => undefined
      ),
      runs: { ...memoryRuns(), markAwaitingApproval },
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    expect(res.status).toBe(200)

    const types = eventsFromSse(await res.text()).map((event) => event.type)
    expect(types[0]).toBe('RUN_STARTED')
    expect(types).toContain('TOOL_CALL_END')
    expect(types).not.toContain('RUN_FINISHED')
    expect(markAwaitingApproval).toHaveBeenCalledWith(ids.runId)
  })

  it('marks the run failed when the checkpoint read throws', async () => {
    const env = testEnv()
    const markFailed = vi.fn(async () => undefined)
    const markCompleted = vi.fn(async () => undefined)
    const graph = createAnalystGraph(
      new FakeListChatModel({ responses: [reply] })
    )
    vi.spyOn(graph, 'getState').mockRejectedValue(new Error('checkpoint down'))

    const app = createApp(env, {
      graph,
      runs: { ...memoryRuns(), markFailed, markCompleted },
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    const events = eventsFromSse(await res.text())
    expect(events.at(-1)).toMatchObject({
      type: 'RUN_ERROR',
      message: 'checkpoint down',
    })
    expect(markFailed).toHaveBeenCalledWith(ids.runId)
    expect(markCompleted).not.toHaveBeenCalled()
  })

  it('emits the Kanban tool from the node update when stream chunks omit it', async () => {
    const env = testEnv()
    const cards = [
      { title: 'Book a walk' },
      { title: 'Pay online' },
      { title: 'Leave a review' },
    ]
    const model = {
      bindTools() {
        return this
      },
      async stream() {
        return (async function* () {
          yield new AIMessageChunk({ content: 'Here is the analysis.' })
          yield new AIMessageChunk({
            content: '',
            tool_call_chunks: [
              {
                name: 'render_kanban',
                args: JSON.stringify({ cards }),
                id: 'call-1',
                index: 0,
                type: 'tool_call_chunk',
              },
            ],
          })
        })()
      },
    } as unknown as BaseChatModel

    const app = createApp(env, {
      graph: createAnalystGraph(
        model,
        new MemorySaver(),
        async () => undefined
      ),
      runs: memoryRuns(),
    })

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    })

    const types = eventsFromSse(await res.text()).map((event) => event.type)
    expect(types).toContain('TOOL_CALL_END')
    expect(types).not.toContain('RUN_FINISHED')
  })
})
