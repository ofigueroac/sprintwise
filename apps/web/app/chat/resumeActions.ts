'use server'

import { and, desc, eq } from 'drizzle-orm'

import { messages, projects, runs } from '@repo/db/schema'
import { ResumeRunIdsSchema } from '@repo/schemas'

import { getCurrentUser } from '@/auth'
import { mintAgentRunToken } from '@/lib/agent-token'
import { getDb } from '@/lib/db'

// Same 60s JWT as a new run but it reuses the paused project and run ids
export async function createResumeToken(projectId: string, runId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'sign in to resume a run' }
  }

  const secret = process.env.AGENT_JWT_SECRET

  if (!secret) {
    return { error: 'AGENT_JWT_SECRET is not set' }
  }

  const ids = ResumeRunIdsSchema.safeParse({ projectId, runId })
  if (!ids.success) {
    return { error: 'Invalid project or run id' }
  }

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, ids.data.projectId))
    .limit(1)

  if (!project || project.userId !== user.id) {
    return { error: 'Project not found' }
  }

  const [run] = await getDb()
    .select()
    .from(runs)
    .where(eq(runs.id, ids.data.runId))
    .limit(1)

  if (!run || run.projectId !== project.id) {
    return { error: 'Run not found' }
  }

  if (run.status !== 'awaiting_approval') {
    return { error: 'This run is not waiting for approval' }
  }

  const token = await mintAgentRunToken(
    {
      sub: user.id,
      projectId: project.id,
      runId: run.id,
    },
    secret
  )

  return { token, projectId: project.id, runId: run.id }
}

// Reload the paused run after a refresh so the dialog and board come back
export async function loadAwaitingRun() {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'sign in to resume a run' }
  }

  const [paused] = await getDb()
    .select({
      runId: runs.id,
      projectId: projects.id,
      idea: projects.idea,
    })
    .from(runs)
    .innerJoin(projects, eq(runs.projectId, projects.id))
    .where(
      and(eq(projects.userId, user.id), eq(runs.status, 'awaiting_approval'))
    )
    .orderBy(desc(runs.updatedAt))
    .limit(1)

  if (!paused) {
    return {}
  }

  const rows = await getDb()
    .select()
    .from(messages)
    .where(eq(messages.runId, paused.runId))
    .orderBy(messages.createdAt)

  return {
    projectId: paused.projectId,
    runId: paused.runId,
    idea: paused.idea,
    messages: rows
      .filter((row) => row.role === 'assistant')
      .map((row) => ({
        id: row.id,
        role: 'assistant' as const,
        content: row.content,
        done: true,
      })),
  }
}
