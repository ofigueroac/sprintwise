'use server'

import { eq } from 'drizzle-orm'

import { projects, runs } from '@repo/db/schema'
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
