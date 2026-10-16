'use client'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
} from '@repo/ui/components'

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
    <Alert variant="destructive">
      <AlertTitle>{message}</AlertTitle>
      {code ? <AlertDescription>{code}</AlertDescription> : null}
      <AlertAction>
        <Button type="button" onClick={onRetry} loading={pending}>
          Retry
        </Button>
      </AlertAction>
    </Alert>
  )
}
