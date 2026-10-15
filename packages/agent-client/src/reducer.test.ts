import { EventType } from '@ag-ui/core';
import { describe, expect, it } from 'vitest';

import type { AgUiEvent } from '@repo/schemas';

import { AGENT_STATUS, initialAgentRunState, reduceAgUiEvent } from './reducer';

const ids = {
  threadId: 'project-1',
  runId: 'run-1',
  messageId: 'message-1',
};

// Feed events in order the same way the SSE client will
function play(events: AgUiEvent[]) {
  return events.reduce(reduceAgUiEvent, initialAgentRunState);
}

describe('reduceAgUiEvent', () => {
  it('glues token deltas into one assistant message then finishes', () => {
    const state = play([
      {
        type: EventType.RUN_STARTED,
        threadId: ids.threadId,
        runId: ids.runId,
      },
      {
        type: EventType.TEXT_MESSAGE_START,
        messageId: ids.messageId,
        role: 'assistant',
      },
      {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: ids.messageId,
        delta: 'Hello',
      },
      {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: ids.messageId,
        delta: ' world',
      },
      {
        type: EventType.TEXT_MESSAGE_END,
        messageId: ids.messageId,
      },
      {
        type: EventType.RUN_FINISHED,
        threadId: ids.threadId,
        runId: ids.runId,
      },
    ]);

    expect(state.status).toBe(AGENT_STATUS.FINISHED);
    expect(state.messages).toEqual([
      {
        id: ids.messageId,
        role: 'assistant',
        content: 'Hello world',
        done: true,
      },
    ]);
  });

  it('keeps streamed text on RUN_ERROR and still accepts a token before START', () => {
    // CONTENT can arrive first if frames are reordered on the wire
    const state = play([
      {
        type: EventType.RUN_STARTED,
        threadId: ids.threadId,
        runId: ids.runId,
      },
      {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: ids.messageId,
        delta: 'Hello',
      },
      {
        type: EventType.RUN_ERROR,
        message: 'Gemini is down',
        code: 'MODEL',
      },
    ]);

    expect(state.status).toBe(AGENT_STATUS.ERROR);
    expect(state.error).toEqual({ message: 'Gemini is down', code: 'MODEL' });
    expect(state.messages).toEqual([
      {
        id: ids.messageId,
        role: 'assistant',
        content: 'Hello',
        done: false,
      },
    ]);
  });
});
