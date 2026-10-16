'use client'

import { useEffect, useRef } from 'react'
import { useStore } from 'zustand/react'
import { createAgentRunStore, type AgentRunStore } from './AgentRunStore'

export function useAgentRun() {
  const storeRef = useRef<AgentRunStore | null>(null)
  storeRef.current ??= createAgentRunStore()
  const store = storeRef.current

  useEffect(() => {
    return () => {
      store.getState().abort()
    }
  }, [store])

  const state = useStore(store)
  const { start, resume, restore, abort, ...run } = state

  return { ...run, start, resume, restore, abort }
}
