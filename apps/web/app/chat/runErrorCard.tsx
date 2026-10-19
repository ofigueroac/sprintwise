'use client'

import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components'

export type RunErrorCardProps = {
  message: string
  code?: string
}

export function RunErrorCard({ message, code }: RunErrorCardProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{message}</AlertTitle>
      {code ? <AlertDescription>{code}</AlertDescription> : null}
    </Alert>
  )
}
