import { z } from 'zod'

import { StoryStatusSchema, type StoryStatus } from './story'

export const MilestoneCategorySchema = z.enum([
  'Marketing',
  'Validation',
  'Execution',
  'Operations',
])

export type MilestoneCategory = z.infer<typeof MilestoneCategorySchema>

export const MilestoneStatusSchema = z.enum([
  'To Test',
  'Building',
  'Validated',
])

export type MilestoneStatus = z.infer<typeof MilestoneStatusSchema>

// Board columns stay todo / in_progress / done until the UI changes
export const milestoneStatusToStoryStatus = {
  'To Test': 'todo',
  Building: 'in_progress',
  Validated: 'done',
} as const satisfies Record<MilestoneStatus, StoryStatus>

export const MilestoneCardSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  milestone_category: MilestoneCategorySchema,
  status: MilestoneStatusSchema,
})

export type MilestoneCard = z.infer<typeof MilestoneCardSchema>

export const RENDER_KANBAN_TOOL = 'render_kanban'

export const RenderKanbanArgsSchema = z.object({
  // Array of enum so Gemini gets items plus enum and not a JSON Schema tuple
  columns: z.array(MilestoneStatusSchema).length(3),
  cards: z.array(MilestoneCardSchema).min(3).max(8),
})

export type RenderKanbanArgs = z.infer<typeof RenderKanbanArgsSchema>

export function storyStatusForMilestone(status: MilestoneStatus) {
  const mapped = milestoneStatusToStoryStatus[status]
  return StoryStatusSchema.parse(mapped)
}
