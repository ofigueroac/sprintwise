import { EventType } from '@ag-ui/core'

import { AgUiEventSchema, type AgUiEvent } from '@repo/schemas'

export type LangGraphToolCall = {
  id?: string
  name?: string
  args?: unknown
}
export type LangGraphStreamMessage = {
  getType: () => string
  content: unknown
  tool_calls?: LangGraphToolCall[]
}

export function toolCalls(message: object): LangGraphToolCall[] {
  // LangChain keeps this field in snake_case
  if (!('tool_calls' in message) || !Array.isArray(message.tool_calls)) {
    return []
  }

  return message.tool_calls.filter(
    (call): call is LangGraphToolCall =>
      Boolean(call) && typeof call === 'object'
  )
}

/** Mapper `streamMode: "messages"` chunk: `[message, metadata]`. */
export type LangGraphStreamChunk = readonly [LangGraphStreamMessage, unknown]

type MapperOptions = {
  threadId: string
  runId: string
  messageId: string
}

function textFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }

      if (
        part &&
        typeof part === 'object' &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text
      }

      return ''
    })
    .join('')
}

export function createLangGraphAgUiMapper({
  threadId,
  runId,
  messageId,
}: MapperOptions) {
  let messageOpen = false
  const emittedToolCalls = new Set<string>()
  return {
    start(): AgUiEvent {
      return { type: EventType.RUN_STARTED, threadId, runId }
    },

    onChunk(chunk: LangGraphStreamChunk): AgUiEvent[] {
      const [message] = chunk

      if (message.getType() !== 'ai') {
        return []
      }
      const events: AgUiEvent[] = []
      const delta = textFromContent(message.content)

      if (delta.length > 0) {
        if (!messageOpen) {
          messageOpen = true
          events.push({
            type: EventType.TEXT_MESSAGE_START,
            messageId,
            role: 'assistant',
          })
        }

        events.push({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta,
        })
      }

      events.push(...this.tools(message))
      return events
    },

    // Stream chunks often omit a finished tool call. The node update has it.
    tools(message: object): AgUiEvent[] {
      const events: AgUiEvent[] = []

      for (const call of toolCalls(message)) {
        const id = call.id || call.name
        if (!id || !call.name || emittedToolCalls.has(id)) {
          continue
        }

        const argsJson = JSON.stringify(call.args ?? {})
        if (argsJson === '{}') {
          continue
        }

        emittedToolCalls.add(id)
        events.push(
          {
            type: EventType.TOOL_CALL_START,
            toolCallId: id,
            toolCallName: call.name,
          },
          {
            type: EventType.TOOL_CALL_ARGS,
            toolCallId: id,
            delta: argsJson,
          },
          {
            type: EventType.TOOL_CALL_END,
            toolCallId: id,
          }
        )
      }

      return events
    },

    closeMessage(): AgUiEvent[] {
      if (!messageOpen) {
        return []
      }

      messageOpen = false
      return [{ type: EventType.TEXT_MESSAGE_END, messageId }]
    },

    end(): AgUiEvent[] {
      const events = this.closeMessage()
      events.push({ type: EventType.RUN_FINISHED, threadId, runId })
      return events
    },

    error(message: string): AgUiEvent {
      return { type: EventType.RUN_ERROR, message }
    },
  }
}

// Check the event against our Zod union, then send it as one SSE frame
export async function writeEvent(
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

// A messages-mode chunk is [message, metadata]. Updates and other modes are skipped
export function asMessageChunk(chunk: unknown): LangGraphStreamChunk | null {
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
