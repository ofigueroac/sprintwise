import { AIMessage, SystemMessage } from '@langchain/core/messages'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { BaseCheckpointSaver } from '@langchain/langgraph'
import {
  END,
  START,
  StateGraph,
  MessagesAnnotation,
  interrupt,
} from '@langchain/langgraph'

import { RENDER_KANBAN_TOOL, RenderKanbanArgsSchema } from '@repo/schemas'

import { toolCalls } from '../agui/from-langgraph'
import { ANALYST_SYSTEM_PROMPT } from '../prompts/analyst'
import {
  createRenderKanbanTool,
  type SaveKanbanStories,
} from '../render-kanban'

function hasKanbanArgs(message: object) {
  return toolCalls(message).some(
    (call) =>
      call.name === RENDER_KANBAN_TOOL &&
      RenderKanbanArgsSchema.safeParse(call.args).success
  )
}

type AnalystModel = Pick<BaseChatModel, 'stream'> & {
  bindTools?: BaseChatModel['bindTools']
}

export function createAnalystGraph(
  model: AnalystModel,
  checkpointer?: BaseCheckpointSaver,
  saveStories?: SaveKanbanStories
) {
  const kanbanTool = saveStories ? createRenderKanbanTool(saveStories) : null
  const llm =
    kanbanTool && typeof model.bindTools === 'function'
      ? model.bindTools([kanbanTool])
      : model

  const analyst = async (
    state: typeof MessagesAnnotation.State,
    config: { configurable?: { thread_id?: string } }
  ) => {
    const stream = await llm.stream([
      new SystemMessage(ANALYST_SYSTEM_PROMPT),
      ...state.messages,
    ])
    let response
    for await (const chunk of stream) {
      response = response ? response.concat(chunk) : chunk
      // Gemini often keeps the HTTP body open after a function call
      if (hasKanbanArgs(response)) {
        break
      }
    }

    const message = response ?? new AIMessage('')

    for (const call of toolCalls(message)) {
      if (call.name !== RENDER_KANBAN_TOOL || !kanbanTool) {
        continue
      }

      const parsed = RenderKanbanArgsSchema.safeParse(call.args)
      if (!parsed.success) {
        continue
      }

      await kanbanTool.invoke(parsed.data, config)
    }

    return { messages: [message] }
  }

  // Separate node so the Kanban stream can finish before we pause
  const waitForApproval = (state: typeof MessagesAnnotation.State) => {
    const last = state.messages.at(-1)
    const savedKanban = last
      ? toolCalls(last).some((call) => call.name === RENDER_KANBAN_TOOL)
      : false

    if (savedKanban) {
      interrupt({ reason: 'awaiting_approval' })
    }

    return {}
  }

  return new StateGraph(MessagesAnnotation)
    .addNode('analyst', analyst)
    .addNode('waitForApproval', waitForApproval)
    .addEdge(START, 'analyst')
    .addEdge('analyst', 'waitForApproval')
    .addEdge('waitForApproval', END)
    .compile({ checkpointer })
}
