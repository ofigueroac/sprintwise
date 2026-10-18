'use client'

import { useEffect, useState } from 'react'

import styles from './waking-agent.module.css'

const AGENTS_URL = process.env.NEXT_PUBLIC_AGENTS_URL ?? 'http://localhost:8787'

export function WakingAgent() {
  const [awake, setAwake] = useState(false)

  useEffect(() => {
    // Skip a late response after the page is gone
    let cancelled = false

    async function ping() {
      try {
        // The free Render tier sleeps when not use this request wakes it
        const response = await fetch(`${AGENTS_URL}/health`)
        if (!cancelled) {
          setAwake(response.ok)
        }
      } catch {
        // A failed check means the agent is still down
        if (!cancelled) {
          setAwake(false)
        }
      }
    }

    void ping()
    // Keep checking so a later sleep shows the notice again
    const timer = setInterval(() => {
      void ping()
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  // Hide the line once the agent answers
  if (awake) {
    return null
  }

  return (
    <p className={styles.notice} role="status">
      Waking agent
    </p>
  )
}
