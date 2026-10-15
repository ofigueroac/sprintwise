import { z } from 'zod'

import { StorySchema } from './story'

// The model may omit ids so we mint them when we save the row
export const KanbanStoryDraftsSchema = StorySchema.omit({ id: true }).extend({
  id: z.uuid().optional(),
})

export type KanbanStoryDraft = z.infer<typeof KanbanStoryDraftsSchema>

// Name the graph tool uses when it asks the UI to show a board
export const RENDER_KANBAN_TOOL = 'render_kanban'

// Keep the board small enough to review in one pass
export const RenderKanbanArgsSchema = z.object({
  stories: z.array(KanbanStoryDraftsSchema).min(3).max(8),
})

export type RenderKanbanArgs = z.infer<typeof RenderKanbanArgsSchema>
