import { eq } from 'drizzle-orm';

import type { Database } from '@repo/db';
import { messages, projects, runs } from '@repo/db/schema';

type UserTurn = {
  userId: string;
  projectId: string;
  runId: string;
  name: string;
  idea: string;
};

export function createRunStore(db: Database) {
  return {
    async recordUserTurn({ userId, projectId, runId, name, idea }: UserTurn) {
      await db.insert(projects).values({
        id: projectId,
        userId,
        name,
        idea,
      });

      await db.insert(runs).values({
        id: runId,
        projectId,
        status: 'running',
      });

      await db.insert(messages).values({
        runId,
        role: 'user',
        content: idea,
      });
    },

    async recordAssistantMessage(runId: string, content: string) {
      await db.insert(messages).values({
        runId,
        role: 'assistant',
        content,
      });
    },

    async markCompleted(runId: string) {
      await db
        .update(runs)
        .set({ status: 'completed' })
        .where(eq(runs.id, runId));
    },

    async markFailed(runId: string) {
      await db.update(runs).set({ status: 'failed' }).where(eq(runs.id, runId));
    },
  };
}
