'use server';

import { randomUUID } from 'node:crypto';

import { projects, runs } from '@repo/db/schema';
import { CreateRunBodySchema } from '@repo/schemas';

import { getCurrentUser } from '@/auth';
import { mintAgentRunToken } from '@/lib/agent-token';
import { getDb } from '@/lib/db';

// Save a project and run then mint a short lived JWT for the agent
export async function createRunToken(idea: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { error: 'sign in to start a run' };
  }

  const secret = process.env.AGENT_JWT_SECRET;

  if (!secret) {
    return { error: 'AGENT_JWT_SECRET is not set' };
  }

  // Reject an empty or huge idea before we touch the database
  const parsed = CreateRunBodySchema.safeParse({ idea });
  if (!parsed.success) {
    return { error: 'Enter an idea before starting the run' };
  }

  const projectID = randomUUID();
  const runId = randomUUID();
  // Projects table wants a short title so we take the first 80 characters
  const name =
    parsed.data.idea.replaceAll('\n', ' ').slice(0, 80) || 'untitle idea';

  try {
    // One transaction so we never get a project without its run row
    await getDb().transaction(async (transaction) => {
      await transaction.insert(projects).values({
        id: projectID,
        userId: user.id,
        name,
        idea: parsed.data.idea,
      });

      await transaction.insert(runs).values({
        id: runId,
        projectId: projectID,
        status: 'running',
      });
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const detail =
      cause instanceof Error
        ? cause.message
        : error instanceof Error
          ? error.message
          : 'Could not save the project.';

    return { error: detail };
  }

  // The browser will send this JWT when it opens the agent stream
  const token = await mintAgentRunToken(
    {
      sub: user.id,
      projectId: projectID,
      runId,
    },
    secret
  );

  return { token };
}
