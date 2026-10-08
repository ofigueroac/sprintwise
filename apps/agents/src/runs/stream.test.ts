import { FakeListChatModel } from '@langchain/core/utils/testing';
import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import {
  AGENT_TOKEN_AUDIENCE,
  AGENT_TOKEN_EXPIRES_IN,
  AGENT_TOKEN_ISSUER,
  AgUiEventSchema,
  type AgUiEvent,
} from '@repo/schemas';

import { createApp } from '../app';
import { createAnalystGraph } from '../graphs/analyst';
import { testEnv } from '../test/env';
import type { createRunStore } from './persist';

const ids = {
  sub: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
};

const reply = 'Hello from the Analyst';

// Same shape as the real store, but it only keeps arrays in memory.
function memoryRuns(): ReturnType<typeof createRunStore> {
  return {
    async recordUserTurn() {},
    async recordAssistantMessage() {},
    async markCompleted() {},
    async markFailed() {},
  };
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
    .sign(new TextEncoder().encode(secret));

  return `Bearer ${token}`;
}

// SSE frames look like: event: NAME , data: {json}
function eventsFromSse(body: string): AgUiEvent[] {
  return body
    .split('\n\n')
    .map((frame) => {
      const line = frame.split('\n').find((row) => row.startsWith('data: '));

      if (!line) {
        return null;
      }

      return AgUiEventSchema.parse(JSON.parse(line.slice('data: '.length)));
    })
    .filter((event): event is AgUiEvent => event !== null);
}

describe('POST /runs', () => {
  it('streams RUN_STARTED, the fake reply, then RUN_FINISHED', async () => {
    const env = testEnv();

    // FakeListChatModel pretends to be Gemini and always returns `reply`.
    const app = createApp(env, {
      graph: createAnalystGraph(new FakeListChatModel({ responses: [reply] })),
      runs: memoryRuns(),
    });

    const res = await app.request('/runs', {
      method: 'POST',
      headers: {
        Authorization: await bearer(env.AGENT_JWT_SECRET),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idea: 'A dog walking app' }),
    });

    expect(res.status).toBe(200);

    const events = eventsFromSse(await res.text());
    const types = events.map((event) => event.type);
    const text = events
      .filter((event) => event.type === 'TEXT_MESSAGE_CONTENT')
      .map((event) => event.delta)
      .join('');

    expect(types[0]).toBe('RUN_STARTED');
    expect(types).toContain('TEXT_MESSAGE_START');
    expect(text).toBe(reply);
    expect(types.at(-1)).toBe('RUN_FINISHED');

    const started = events[0];
    expect(started?.type).toBe('RUN_STARTED');
    if (started?.type === 'RUN_STARTED') {
      expect(started.threadId).toBe(ids.projectId);
      expect(started.runId).toBe(ids.runId);
    }
  });
});
