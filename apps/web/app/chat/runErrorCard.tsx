'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from '@repo/ui/components'

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
    <Alert variant="destructive" className={styles.alert}>
      <AlertTitle className={styles.title}>{message}</AlertTitle>
      {code ? (
        <AlertDescription className={styles.description}>
          {code}
        </AlertDescription>
      ) : null}
      <div className={styles.action}>
        <Button type="button" onClick={onRetry} loading={pending}>
          Retry
        </Button>
      </div>
    </Alert>
  )
}
