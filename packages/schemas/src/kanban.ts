import { z } from 'zod'

import { StorySchema } from './story'

// the model may omits ids we mint them when se save the row
export const KanbanStoryDraftsSchema = StorySchema.omit({ id: true }).extend({
  id: z.uuid().optional(),
})

export type KanbanStoryDraft = z.infer<typeof KanbanStoryDraftsSchema>

export const RENDER_KANBAN_TOOL = 'render_kanban'

export const RenderKanbanArgsSchema = z.object({
  stories: z.array(KanbanStoryDraftsSchema).min(3).max(8),
})

export type RenderKanbanArgs = z.infer<typeof RenderKanbanArgsSchema>
