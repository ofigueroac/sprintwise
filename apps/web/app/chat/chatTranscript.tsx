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
  const [userOpen, setUserOpen] = useState(false)
  const [seenBoardReady, setSeenBoardReady] = useState(boardReady)

  if (boardReady !== seenBoardReady) {
    setSeenBoardReady(boardReady)
    setUserOpen(false)
  }

  const open = wide || busy || !boardReady || userOpen

  function onToggle(event: ToggleEvent<HTMLDetailsElement>) {
    if (wide || busy || !boardReady) {
      return
    }

    setUserOpen(event.currentTarget.open)
  }

  return (
    <details className={styles.transcript} open={open} onToggle={onToggle}>
      <summary className={styles.transcriptSummary}>
        {busy ? 'Analyst is writing' : 'Analyst reply'}
      </summary>
      {children}
    </details>
  )
}
