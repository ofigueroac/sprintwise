import { createStore } from 'zustand/vanilla'

import {
  AGENT_STATUS,
  initialAgentRunState,
  reduceAgUiEvent,
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

// UI state plus the actions the screen will call
export type AgentRunStoreState = AgentRunState & {
  start: (input: StartAgentRunInput) => Promise<void>
  resume: (input: ResumeAgentRunInput) => Promise<void>
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
    ) {
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
          return
        }

        set({
          status: AGENT_STATUS.ERROR,
          error: {
            message: error instanceof Error ? error.message : 'The run failed',
          },
        })
      }
    }

    return {
      ...initialAgentRunState,

      async start(input) {
        await runStream(input.url, input.token, { idea: input.idea }, true)
      },

      async resume(input) {
        await runStream(
          input.url,
          input.token,
          { approved: input.approved },
          false
        )
      },

      abort() {
        controller?.abort()
        controller = null
      },
    }
  })
}
export type AgentRunStore = ReturnType<typeof createAgentRunStore>
