import { z } from 'zod'

export const StoryStatusSchema = z.enum(['brainstorm', 'mvp', 'icebox'])
export type StoryStatus = z.infer<typeof StoryStatusSchema>

export const StoryPrioritySchema = z.enum(['low', 'medium', 'high'])
export type StoryPriority = z.infer<typeof StoryPrioritySchema>

export const StorySchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  acceptanceCriteria: z.array(z.string().trim().min(1)).max(10).default([]),
  status: StoryStatusSchema.default('brainstorm'),
  priority: StoryPrioritySchema.default('medium'),
  position: z.number().int().nonnegative().default(0),
})
export type Story = z.infer<typeof StorySchema>
