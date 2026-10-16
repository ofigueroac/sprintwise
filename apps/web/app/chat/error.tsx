'use client'

import { Button } from '@repo/ui/components'

import styles from './error.module.css'

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className={styles.panel} role="alert">
      <p>The chat page failed to load.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
