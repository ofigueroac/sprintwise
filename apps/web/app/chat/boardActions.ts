'use server'

import { eq } from 'drizzle-orm'

import { projects, stories } from '@repo/db/schema'
import { StorySchema, StoryStatusSchema, type Story } from '@repo/schemas'

import { getCurrentUser } from '@/auth'
import { getDb } from '@/lib/db'

export async function listProjectStories(projectId: string) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'sign in to load stories' }
  }

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project || project.userId !== user.id) {
    return { error: 'Project not found' }
  }

  const rows = await getDb()
    .select()
    .from(stories)
    .where(eq(stories.projectId, projectId))

  const board: Story[] = rows
    .map((row) =>
      StorySchema.parse({
        id: row.id,
        title: row.title,
        description: row.description,
        acceptanceCriteria: row.acceptanceCriteria,
        status: row.status,
        priority: row.priority,
        position: row.position,
      })
    )
    .sort((a, b) => a.position - b.position)

  return { stories: board }
}

export async function moveProjectStory(input: {
  storyId: string
  status: Story['status']
  position: number
}) {
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'sign in to move a story' }
  }

  const status = StoryStatusSchema.safeParse(input.status)
  if (!status.success) {
    return { error: 'Invalid story status' }
  }

  const [story] = await getDb()
    .select()
    .from(stories)
    .where(eq(stories.id, input.storyId))
    .limit(1)

  if (!story) {
    return { error: 'Story not found' }
  }

  const [project] = await getDb()
    .select()
    .from(projects)
    .where(eq(projects.id, story.projectId))
    .limit(1)

  if (!project || project.userId !== user.id) {
    return { error: 'Story not found' }
  }

  await getDb()
    .update(stories)
    .set({ status: status.data, position: input.position })
    .where(eq(stories.id, input.storyId))

  return { ok: true as const }
}
