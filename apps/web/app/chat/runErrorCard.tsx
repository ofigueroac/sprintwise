'use client'

import { Button } from '@repo/ui/components'

import styles from './runErrorCard.module.css'

export type RunErrorCardProps = {
  message: string
  code?: string
  onRetry: () => void
  pending?: boolean
}

export function RunErrorCard({
  message,
  code,
  onRetry,
  pending = false,
}: RunErrorCardProps) {
  return (
    <div className={styles.card} role="alert">
      <p className={styles.copy}>{message}</p>
      {code ? <p className="text-xs text-muted-foreground">{code}</p> : null}
      <div className={styles.actions}>
        <Button type="button" onClick={onRetry} loading={pending}>
          Retry
        </Button>
      </div>
    </div>
  )
}
