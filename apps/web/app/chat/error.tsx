'use client'

import { Alert, AlertAction, AlertTitle, Button } from '@repo/ui/components'

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>The chat page failed to load.</AlertTitle>
      <AlertAction>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </AlertAction>
    </Alert>
  )
}
