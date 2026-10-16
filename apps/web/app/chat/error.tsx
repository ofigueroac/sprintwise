'use client'

import { Alert, AlertTitle, Button } from '@repo/ui/components'

export default function ChatError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Alert variant="destructive" className="gap-3">
      <AlertTitle>The chat page failed to load.</AlertTitle>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </Alert>
  )
}
