import { createStore } from 'zustand/vanilla'

import { RENDER_KANBAN_TOOL } from '@repo/schemas'

import {
  AGENT_STATUS,
  initialAgentRunState,
  reduceAgUiEvent,
  type AgentMessage,
  type AgentRunState,
} from './reducer'
import { streamAgentRun } from './stream'

export type StartAgentRunInput = {
  url: string
  token: string
  idea: string
}

export type ResumeAgentRunInput = {
  url: string
  token: string
  approved: boolean
}

export type RestoreAgentRunInput = {
  threadId: string
  runId: string
  messages: AgentMessage[]
}

// UI state plus the actions the screen will call
export type AgentRunStoreState = AgentRunState & {
  start: (input: StartAgentRunInput) => Promise<AgentRunState>
  resume: (input: ResumeAgentRunInput) => Promise<AgentRunState>
  restore: (input: RestoreAgentRunInput) => void
  abort: () => void
}

// One store per screen or test so two runs do not share an abort button
export function createAgentRunStore() {
  return createStore<AgentRunStoreState>((set, get) => {
    // Lives outside state because React does not need to re-render when it changes
    let controller: AbortController | null = null

    async function runStream(
      url: string,
      token: string,
      body: unknown,
      reset: boolean
    ): Promise<AgentRunState> {
      controller?.abort()
      controller = new AbortController()
      const signal = controller.signal

      if (reset) {
        set({
          ...initialAgentRunState,
          status: AGENT_STATUS.RUNNING,
        })
      } else {
        // Resume keeps the Kanban tools and the streamed reply
        set({
          status: AGENT_STATUS.RUNNING,
          error: null,
        })
      }

      try {
        await streamAgentRun({
          url,
          token,
          body,
          signal,
          onEvent: (event) => {
            // Feed each SSE event through the reducer
            set(reduceAgUiEvent(get(), event))
          },
        })

        const current = get()
        // The stream closed without RUN_FINISHED because the graph hit interrupt()
        if (current.status === AGENT_STATUS.RUNNING) {
          set({
            status: current.tools.some((tool) => tool.done)
              ? AGENT_STATUS.AWAITING_APPROVAL
              : AGENT_STATUS.FINISHED,
          })
        }
      } catch (error) {
        // User hit abort so leave the last tokens on screen
        if (signal.aborted) {
          return get()
        }

        set({
          status: AGENT_STATUS.ERROR,
          error: {
            message: error instanceof Error ? error.message : 'The run failed',
          },
        })
      }

      return get()
    }

    return {
      ...initialAgentRunState,

      async start(input) {
        return runStream(input.url, input.token, { idea: input.idea }, true)
      },

      async resume(input) {
        return runStream(
          input.url,
          input.token,
          { approved: input.approved },
          false
        )
      },

      restore(input) {
        // A new Ask already started so do not overwrite the live stream
        if (get().status !== AGENT_STATUS.IDDLE) {
          return
        }

        set({
          ...initialAgentRunState,
          status: AGENT_STATUS.AWAITING_APPROVAL,
          threadId: input.threadId,
          runId: input.runId,
          messages: input.messages,
          tools: [
            {
              id: 'restored-kanban',
              name: RENDER_KANBAN_TOOL,
              argsText: '{}',
              done: true,
            },
          ],
        })
      },

      abort() {
        controller?.abort()
        controller = null
      },
    }
  })
}
export type AgentRunStore = ReturnType<typeof createAgentRunStore>
