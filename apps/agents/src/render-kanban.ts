import { tool } from '@langchain/core/tools'

import {
  RENDER_KANBAN_TOOL,
  RenderKanbanArgsSchema,
  type RenderKanbanArgs,
} from '@repo/schemas'

export type SaveKanbanStories = (
  projectId: string,
  args: RenderKanbanArgs
) => Promise<void>

const descriptionString = `Put 3 to 5 validation milestones on the board.
columns must be To Test, Building, and Validated.
Each card needs title, description, milestone_category, and status.
Call this once after the written analysis, never instead of it.`

export function createRenderKanbanTool(saveStories: SaveKanbanStories) {
  return tool(
    async (args, config) => {
      const projectId = config.configurable?.thread_id

      if (typeof projectId !== 'string' || projectId.length === 0) {
        throw new Error('Missing project id on the graph config')
      }

      await saveStories(projectId, args)
      return `Saved ${args.cards.length} milestones to the board`
    },
    {
      name: RENDER_KANBAN_TOOL,
      description: descriptionString,
      schema: RenderKanbanArgsSchema,
    }
  )
}
