'use client'

import { useEffect, useState, type ReactNode } from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@repo/ui/components'

import styles from './chatForm.module.css'

const WIDE_QUERY = '(min-width: 768px)'

function useWideLayout() {
  const [wide, setWide] = useState(true)

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

  if (wide) {
    return children
  }

  const lockedOpen = busy || !boardReady
  const open = lockedOpen || userOpen

  return (
    <Collapsible
      className={styles.transcript}
      open={open}
      onOpenChange={(next) => {
        if (lockedOpen) {
          return
        }

        setUserOpen(next)
      }}
    >
      <CollapsibleTrigger className={styles.transcriptSummary}>
        {busy ? 'Analyst is writing' : 'Analyst reply'}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  )
}
