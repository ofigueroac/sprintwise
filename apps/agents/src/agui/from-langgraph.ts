import { EventType } from '@ag-ui/core';

import type { AgUiEvent } from '@repo/schemas';

export type LangGraphStreamMessage = {
  getType: () => string;
  content: unknown;
};

/** Mapper `streamMode: "messages"` chunk: `[message, metadata]`. */
export type LangGraphStreamChunk = readonly [LangGraphStreamMessage, unknown];

type MapperOptions = {
  threadId: string;
  runId: string;
  messageId: string;
};

function textFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }

      if (
        part &&
        typeof part === 'object' &&
        'type' in part &&
        part.type === 'text' &&
        'text' in part &&
        typeof part.text === 'string'
      ) {
        return part.text;
      }

      return '';
    })
    .join('');
}

export function createLangGraphAgUiMapper({
  threadId,
  runId,
  messageId,
}: MapperOptions) {
  let messageOpen = false;

  return {
    start(): AgUiEvent {
      return { type: EventType.RUN_STARTED, threadId, runId };
    },

    onChunk(chunk: LangGraphStreamChunk): AgUiEvent[] {
      const [message] = chunk;

      if (message.getType() !== 'ai') {
        return [];
      }

      const delta = textFromContent(message.content);

      if (delta.length === 0) {
        return [];
      }

      if (messageOpen) {
        return [{ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta }];
      }

      messageOpen = true;

      return [
        { type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta },
      ];
    },

    end(): AgUiEvent[] {
      const events: AgUiEvent[] = [];

      if (messageOpen) {
        events.push({ type: EventType.TEXT_MESSAGE_END, messageId });
        messageOpen = false;
      }

      events.push({ type: EventType.RUN_FINISHED, threadId, runId });

      return events;
    },

    error(message: string): AgUiEvent {
      return { type: EventType.RUN_ERROR, message };
    },
  };
}
