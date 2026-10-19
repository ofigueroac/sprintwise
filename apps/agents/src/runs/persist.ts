import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Database } from '@repo/db'
import { messages, projects, runs, stories, users } from '@repo/db/schema'
import type { RenderKanbanArgs } from '@repo/schemas'

type UserTurn = {
  userId: string
  projectId: string
  runId: string
  name: string
  idea: string
}

export function createRunStore(db: Database) {
  return {
    async recordUserTurn({ userId, projectId, runId, name, idea }: UserTurn) {
      return db.transaction(async (transaction) => {
        const [user] = await transaction
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1)

        if (!user) {
          throw Error(`No users row for ${userId} Sign out and back in `)
        }

        await transaction
          .insert(projects)
          .values({
            id: projectId,
            userId,
            name,
            idea,
          })
          .onConflictDoNothing({ target: projects.id })

        await transaction
          .insert(runs)
          .values({
            id: runId,
            projectId,
            status: 'running',
          })
          .onConflictDoNothing({ target: runs.id })

        // Hold the run row so a second request waits until this message exists
        await transaction
          .select({ id: runs.id })
          .from(runs)
          .where(eq(runs.id, runId))
          .for('update')

        const [existing] = await transaction
          .select({ id: messages.id })
          .from(messages)
          .where(and(eq(messages.runId, runId), eq(messages.role, 'user')))
          .limit(1)

        if (existing) {
          return false
        }

        await transaction.insert(messages).values({
          runId,
          role: 'user',
          content: idea,
        })

        return true
      })
    },

    async recordAssistantMessage(runId: string, content: string) {
      await db.insert(messages).values({
        runId,
        role: 'assistant',
        content,
      })
    },

    async markCompleted(runId: string) {
      await db
        .update(runs)
        .set({ status: 'completed' })
        .where(eq(runs.id, runId))
    },

    async markFailed(runId: string) {
      await db.update(runs).set({ status: 'failed' }).where(eq(runs.id, runId))
    },

    async markAwaitingApproval(runId: string) {
      await db
        .update(runs)
        .set({ status: 'awaiting_approval' })
        .where(eq(runs.id, runId))
    },
    async saveKanbanStories(projectId: string, args: RenderKanbanArgs) {
      await db.transaction(async (transaction) => {
        await transaction
          .delete(stories)
          .where(eq(stories.projectId, projectId))

        if (args.cards.length === 0) {
          return
        }

        await transaction.insert(stories).values(
          args.cards.map((card, index) => ({
            id: randomUUID(),
            projectId,
            title: card.title,
            description: card.description,
            acceptanceCriteria: [],
            status: 'brainstorm' as const,
            priority: 'medium' as const,
            position: index,
          }))
        )
      })
    },
  }
}
