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

// UI state plus the two actions the screen will call
export type AgentRunStoreState = AgentRunState & {
  start: (input: StartAgentRunInput) => Promise<void>
  abort: () => void
}

// One store per screen or test so two runs do not share an abort button
export function createAgentRunStore() {
  return createStore<AgentRunStoreState>((set, get) => {
    // Lives outside state because React does not need to re-render when it changes
    let controller: AbortController | null = null

    return {
      ...initialAgentRunState,

      async start(input) {
        // A new start cancels the previous stream if it is still open
        controller?.abort()
        controller = new AbortController()

        set({
          ...initialAgentRunState,
          status: AGENT_STATUS.RUNNING,
        })

        try {
          await streamAgentRun({
            ...input,
            signal: controller.signal,
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
          if (controller.signal.aborted) {
            return
          }

          set({
            status: AGENT_STATUS.ERROR,
            error: {
              message:
                error instanceof Error ? error.message : 'The run failed',
            },
          })
        }
      },

      abort() {
        controller?.abort()
        controller = null
      },
    }
  })
}
export type AgentRunStore = ReturnType<typeof createAgentRunStore>
