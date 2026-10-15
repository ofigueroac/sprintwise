import { EventType } from '@ag-ui/core';
import type { AgUiEvent } from '@repo/schemas';

export type AgentMessage = {
  id: string;
  role: 'assistant';
  content: string;
  done: boolean;
};
export type AgentToolCall = {
  id: string;
  name: string;
  argsText: string;
  done: boolean;
};
export enum AGENT_STATUS {
  IDDLE = 'idle',
  RUNNING = 'running',
  FINISHED = 'finished',
  ERROR = 'error',
}

export type AgentRunState = {
  status: AGENT_STATUS;
  threadId: string | null;
  runId: string | null;
  messages: AgentMessage[];
  tools: AgentToolCall[];
  error: {
    message: string;
    code?: string;
  } | null;
};

// Empty run: nothing happening yet.
export const initialAgentRunState: AgentRunState = {
  status: AGENT_STATUS.IDDLE,
  threadId: null,
  runId: null,
  messages: [],
  tools: [],
  error: null,
};

// Find this assistant message, or start a blank one, then apply the update.
function createAssistantMessage(
  id: string,
  messages: AgentMessage[],
  update: (current: AgentMessage) => AgentMessage
): AgentMessage[] {
  const index = messages.findIndex((message) => message.id === id);
  // New id: start with an empty assistant message.
  const current = messages[index] ?? {
    id,
    role: 'assistant',
    content: '',
    done: false,
  };
  const next = update(current);
  // First time we see this id: add it to the list.
  if (index === -1) {
    return [...messages, next];
  }
  // Already in the list: swap in the updated copy.
  return messages.map((message, i) => (i === index ? next : message));
}
function createToolCall(
  id: string,
  name: string,
  tools: AgentToolCall[],
  update: (current: AgentToolCall) => AgentToolCall
): AgentToolCall[] {
  const index = tools.findIndex((tool) => tool.id === id);
  const current = tools[index] ?? {
    id,
    name,
    argsText: '',
    done: false,
  };
  const next = update(current);

  if (index === -1) {
    return [...tools, next];
  }

  return tools.map((tool, i) => (i === index ? next : tool));
}
// Take the current UI state plus one stream event, return the next state.
export function reduceAgUiEvent(
  state: AgentRunState,
  event: AgUiEvent
): AgentRunState {
  switch (event.type) {
    case EventType.RUN_STARTED:
      // New run: wipe previous messages and mark it as in progress.
      return {
        ...initialAgentRunState,
        status: AGENT_STATUS.RUNNING,
        threadId: event.threadId,
        runId: event.runId,
      };

    case EventType.TEXT_MESSAGE_START:
      // First event for this reply: add an empty assistant message.
      return {
        ...state,
        messages: createAssistantMessage(
          event.messageId,
          state.messages,
          (current) => ({ ...current, done: false })
        ),
      };

    case EventType.TEXT_MESSAGE_CONTENT:
      // Keep the rest of state; glue this token onto that message.
      return {
        ...state,
        messages: createAssistantMessage(
          event.messageId,
          state.messages,
          (current) => ({
            ...current,
            content: current.content + event.delta,
            done: false,
          })
        ),
      };

    case EventType.TEXT_MESSAGE_END:
      // No more tokens for this message; mark it as complete.
      return {
        ...state,
        messages: createAssistantMessage(
          event.messageId,
          state.messages,
          (current) => ({
            ...current,
            done: true,
          })
        ),
      };

    case EventType.RUN_FINISHED:
      // The agent is done; keep the messages, clear any old error.
      return {
        ...state,
        status: AGENT_STATUS.FINISHED,
        threadId: event.threadId,
        runId: event.runId,
        error: null,
      };

    case EventType.RUN_ERROR:
      // Something failed; keep messages so far and store the error text.
      return {
        ...state,
        status: AGENT_STATUS.ERROR,
        error: { message: event.message, code: event.code },
      };

    case EventType.TOOL_CALL_START:
      return {
        ...state,
        tools: createToolCall(
          event.toolCallId,
          event.toolCallName,
          state.tools,
          (current) => ({
            ...current,
            name: event.toolCallName,
            done: false,
          })
        ),
      };

    case EventType.TOOL_CALL_ARGS:
      return {
        ...state,
        tools: createToolCall(event.toolCallId, '', state.tools, (current) => ({
          ...current,
          argsText: current.argsText + event.delta,
          done: false,
        })),
      };

    case EventType.TOOL_CALL_END:
      return {
        ...state,
        tools: createToolCall(event.toolCallId, '', state.tools, (current) => ({
          ...current,
          done: true,
        })),
      };
  }
}
