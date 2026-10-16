'use client'

import { useEffect, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { AGENT_STATUS, type AgentToolCall } from '@repo/agent-client'
import {
  RENDER_KANBAN_TOOL,
  RenderKanbanArgsSchema,
  type Story,
} from '@repo/schemas'
import { KanbanBoard, Skeleton, type KanbanMove } from '@repo/ui/components'

import { listProjectStories, moveProjectStory } from './boardActions'
import styles from './chatBoard.module.css'

export type ChatBoardProps = {
  projectId: string | null
  tools: AgentToolCall[]
  status: AGENT_STATUS
  disabled: boolean
}

export function ChatBoard({
  projectId,
  tools,
  status,
  disabled,
}: ChatBoardProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [error, setError] = useState<string | null>(null)
  const tool = tools.find((call) => call.name === RENDER_KANBAN_TOOL)

  useEffect(() => {
    if (!tool?.done || tool.argsText.length === 0) {
      return
    }

    let payload: unknown
    try {
      payload = JSON.parse(tool.argsText)
    } catch {
      return
    }

    const parsed = RenderKanbanArgsSchema.safeParse(payload)
    if (!parsed.success) {
      console.log('render_kanban payload', payload)
      return
    }

    console.log('render_kanban payload', parsed.data)
  }, [tool?.done, tool?.argsText])
  // A new run wipes tools so hide the last board until stories load again
  const boardStories = tool?.done ? stories : []
  const boardError = tool?.done ? error : null

  useEffect(() => {
    // Stories are saved before interrupt so load once the run is no longer streaming
    if (
      !projectId ||
      !tool?.done ||
      (status !== AGENT_STATUS.FINISHED &&
        status !== AGENT_STATUS.ERROR &&
        status !== AGENT_STATUS.AWAITING_APPROVAL)
    ) {
      return
    }

    let cancelled = false

    void listProjectStories(projectId).then((result) => {
      if (cancelled) {
        return
      }
      if ('stories' in result && result.stories) {
        setStories(result.stories)
        return
      }
      setError(result.error ?? 'Could not load the board')
    })

    return () => {
      cancelled = true
    }
  }, [projectId, tool?.done, status])

  function onMove({ storyId, status: nextStatus, position }: KanbanMove) {
    setStories((current) =>
      current.map((story) =>
        story.id === storyId
          ? { ...story, status: nextStatus, position }
          : story
      )
    )

    void moveProjectStory({ storyId, status: nextStatus, position }).then(
      (result) => {
        if ('error' in result && result.error) {
          setError(result.error)
        }
      }
    )
  }

  return (
    <>
      {boardError ? (
        <p className="text-destructive" role="alert">
          {boardError}
        </p>
      ) : null}

      {tool && !tool.done ? (
        <div className={styles.skeleton} aria-busy="true">
          <Skeleton className={styles.column} />
          <Skeleton className={styles.column} />
          <Skeleton className={styles.column} />
        </div>
      ) : null}

      {boardStories.length > 0 ? (
        <ErrorBoundary
          fallback={
            <p className="text-destructive" role="alert">
              The board failed to render
            </p>
          }
        >
          <KanbanBoard
            key={projectId}
            stories={boardStories}
            onMove={disabled ? undefined : onMove}
            disabled={disabled}
          />
        </ErrorBoundary>
      ) : null}
    </>
  )
}
