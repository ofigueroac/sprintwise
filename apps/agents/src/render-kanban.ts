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

const descriptionString = `Put 3 to 5 candidate user stories on
the Kanban board. Call this once after the written analysis,
never instead of the analysis.`

export function createRenderKanbanTool(saveStories: SaveKanbanStories) {
  return tool(
    async (args, config) => {
      const projectId = config.configurable?.thread_id

      if (typeof projectId !== 'string' || projectId.length === 0) {
        throw new Error('Missing project id on the graph config')
      }

      await saveStories(projectId, args)
      return `Saved ${args.stories.length} stories to the board`
    },
    {
      name: RENDER_KANBAN_TOOL,
      description: descriptionString,
      schema: RenderKanbanArgsSchema,
    }
  )
}
