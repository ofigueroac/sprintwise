'use client'

import type { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

export type MessageErrorProps = {
  resetKeys?: unknown[]
  children: ReactNode
}

export function MessageError({ resetKeys, children }: MessageErrorProps) {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      fallback={
        <p className="text-destructive" role="alert">
          This message failed to render
        </p>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
