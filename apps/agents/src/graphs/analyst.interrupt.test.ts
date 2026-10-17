import { AIMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { MemorySaver } from '@langchain/langgraph'
import { describe, expect, it, vi } from 'vitest'

import { createAnalystGraph } from './analyst'

const threadId = '11111111-1111-4111-8111-111111111111'
const stories = {
  cards: [
    { title: 'Book a walk', description: 'As a owner I want to book a walk.' },
    { title: 'Pay online' },
    { title: 'Leave a review' },
  ],
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
              args: stories,
              type: 'tool_call',
            },
          ],
        })
      })()
    },
  } as unknown as BaseChatModel
}

describe('analyst interrupt', () => {
  it('saves the Kanban then pauses the graph', async () => {
    const saveStories = vi.fn(async () => undefined)
    const graph = createAnalystGraph(
      kanbanModel(),
      new MemorySaver(),
      saveStories
    )
    const config = { configurable: { thread_id: threadId } }

    const stream = await graph.stream(
      { messages: [{ content: 'A dog walking app', type: 'human' }] },
      { ...config, streamMode: 'messages' }
    )

    for await (const _chunk of stream) {
      // Drain the stream so the node can hit interrupt()
    }

    expect(saveStories).toHaveBeenCalledTimes(1)
    const snapshot = await graph.getState(config)
    expect(snapshot.tasks.some((task) => task.interrupts.length > 0)).toBe(true)
  })
})
