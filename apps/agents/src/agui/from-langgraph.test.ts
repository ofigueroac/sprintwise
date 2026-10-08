import { describe, expect, it } from 'vitest';

import { createLangGraphAgUiMapper } from './from-langgraph';

const ids = {
  threadId: 'project-1',
  runId: 'run-1',
  messageId: 'message-1',
};

function ai(content: unknown) {
  return [{ getType: () => 'ai', content }, {}] as const;
}

describe('createLangGraphAgUiMapper', () => {
  it('opens a run, streams one assistant message, then finishes', () => {
    const mapper = createLangGraphAgUiMapper(ids);

    expect(mapper.start()).toEqual({
      type: 'RUN_STARTED',
      threadId: ids.threadId,
      runId: ids.runId,
    });

    expect(mapper.onChunk(ai('Hello'))).toEqual([
      {
        type: 'TEXT_MESSAGE_START',
        messageId: ids.messageId,
        role: 'assistant',
      },
      {
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: ids.messageId,
        delta: 'Hello',
      },
    ]);

    expect(mapper.onChunk(ai(' world'))).toEqual([
      {
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: ids.messageId,
        delta: ' world',
      },
    ]);

    expect(mapper.end()).toEqual([
      { type: 'TEXT_MESSAGE_END', messageId: ids.messageId },
      { type: 'RUN_FINISHED', threadId: ids.threadId, runId: ids.runId },
    ]);
  });

  it('skips non-AI messages and empty content', () => {
    const mapper = createLangGraphAgUiMapper(ids);

    expect(
      mapper.onChunk([{ getType: () => 'human', content: 'hi' }, {}])
    ).toEqual([]);
    expect(mapper.onChunk(ai(''))).toEqual([]);
    expect(mapper.onChunk(ai([{ type: 'text', text: '' }]))).toEqual([]);

    expect(mapper.end()).toEqual([
      { type: 'RUN_FINISHED', threadId: ids.threadId, runId: ids.runId },
    ]);
  });

  it('joins text parts and reports run errors', () => {
    const mapper = createLangGraphAgUiMapper(ids);

    expect(
      mapper.onChunk(
        ai([
          { type: 'text', text: 'A' },
          { type: 'text', text: 'B' },
        ])
      )
    ).toEqual([
      {
        type: 'TEXT_MESSAGE_START',
        messageId: ids.messageId,
        role: 'assistant',
      },
      { type: 'TEXT_MESSAGE_CONTENT', messageId: ids.messageId, delta: 'AB' },
    ]);

    expect(mapper.error('graph failed')).toEqual({
      type: 'RUN_ERROR',
      message: 'graph failed',
    });
  });
});
