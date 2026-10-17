import { z } from 'zod'

export const StoryCardSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
})

export type StoryCard = z.infer<typeof StoryCardSchema>

export const RENDER_KANBAN_TOOL = 'render_kanban'

export const RenderKanbanArgsSchema = z.object({
  cards: z.array(StoryCardSchema).min(3).max(8),
})

export type RenderKanbanArgs = z.infer<typeof RenderKanbanArgsSchema>
