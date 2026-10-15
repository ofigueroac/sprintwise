'use client'

import { useEffect, useState, type ReactNode, type ToggleEvent } from 'react'

import styles from './chatForm.module.css'

const WIDE_QUERY = '(min-width: 768px)'

function useWideLayout() {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(WIDE_QUERY)
    const sync = () => {
      setWide(media.matches)
    }

    sync()
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
    }
  }, [])

  return wide
}

export type ChatTranscriptProps = {
  busy: boolean
  boardReady: boolean
  children: ReactNode
}

export function ChatTranscript({
  busy,
  boardReady,
  children,
}: ChatTranscriptProps) {
  const wide = useWideLayout()
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    // While tokens stream keep the reply open. After the board lands collapse it on small screens
    if (busy) {
      setExpanded(true)
      return
    }

    if (boardReady) {
      setExpanded(false)
    }
  }, [busy, boardReady])

  function onToggle(event: ToggleEvent<HTMLDetailsElement>) {
    if (wide) {
      return
    }

    setExpanded(event.currentTarget.open)
  }

  return (
    <details
      className={styles.transcript}
      open={wide || expanded}
      onToggle={onToggle}
    >
      <summary className={styles.transcriptSummary}>
        {busy ? 'Analyst is writing' : 'Analyst reply'}
      </summary>
      {children}
    </details>
  )
}
