'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import type { Story, StoryStatus } from '@repo/schemas'

import { KanbanCardOverlay } from './kanban-card'
import { KanbanColumn, type KanbanColumnData } from './kanban-column'

const COLUMNS: KanbanColumnData[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
]

function isColumnId(id: UniqueIdentifier): id is StoryStatus {
  return COLUMNS.some((column) => column.id === id)
}

// Empty middle columns lose with closestCorners so prefer what the pointer is over
const detectDrop: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const overCard = hits.find((hit) => !isColumnId(hit.id))
  if (overCard) {
    return [overCard]
  }

  const overColumn = hits.find((hit) => isColumnId(hit.id))
  if (overColumn) {
    return [overColumn]
  }

  return closestCorners(args)
}

function groupStories(stories: Story[]): Record<StoryStatus, Story[]> {
  const next: Record<StoryStatus, Story[]> = {
    todo: [],
    in_progress: [],
    done: [],
  }

  for (const story of stories) {
    next[story.status].push(story)
  }

  for (const column of COLUMNS) {
    next[column.id].sort((a, b) => a.position - b.position)
  }

  return next
}

function columnFor(
  stories: Story[],
  id: UniqueIdentifier
): StoryStatus | undefined {
  if (isColumnId(id)) {
    return id
  }

  return stories.find((story) => story.id === String(id))?.status
}

// Over a column not a card means drop at the end of that list
function dropPosition(
  grouped: Record<StoryStatus, Story[]>,
  storyId: string,
  overId: string,
  overColumn: StoryStatus
) {
  const siblings = grouped[overColumn].filter((story) => story.id !== storyId)
  const overIndex = siblings.findIndex((story) => story.id === overId)
  return overIndex === -1 ? siblings.length : overIndex
}

function placeStory(
  stories: Story[],
  storyId: string,
  status: StoryStatus,
  position: number
) {
  const current = stories.find((story) => story.id === storyId)
  if (!current) {
    return stories
  }

  const without = stories.filter((story) => story.id !== storyId)
  const column = without
    .filter((story) => story.status === status)
    .sort((a, b) => a.position - b.position)
  const rest = without.filter((story) => story.status !== status)
  const index = Math.min(Math.max(position, 0), column.length)
  column.splice(index, 0, { ...current, status, position: index })
  const numbered = column.map((story, i) => ({ ...story, position: i }))
  const next = [...rest, ...numbered]

  // Same reference if nothing moved so drag-over does not loop setState
  const unchanged = stories.every((story) => {
    const copy = next.find((item) => item.id === story.id)
    return copy?.status === story.status && copy.position === story.position
  })

  return unchanged ? stories : next
}

export type KanbanMove = {
  storyId: string
  status: StoryStatus
  position: number
}

export type KanbanBoardProps = {
  stories: Story[]
  onMove?: (data: KanbanMove) => void
  disabled?: boolean
}

export function KanbanBoard({ stories, onMove, disabled }: KanbanBoardProps) {
  const sensors = useSensors(
    // Ignore tiny pointer moves so a click does not start a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  // Live order while dragging so cards slide before the parent save returns
  const [draft, setDraft] = useState(stories)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    // Parent list wins once the pointer is up
    if (activeId) {
      return
    }

    setDraft(stories)
  }, [stories, activeId])

  const grouped = useMemo(() => groupStories(draft), [draft])
  const activeStory = draft.find((story) => story.id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id
    if (!overId || disabled || !activeId || String(overId) === activeId) {
      return
    }

    setDraft((current) => {
      const fromColumn = current.find((story) => story.id === activeId)?.status
      const overColumn = columnFor(current, overId)
      // Same column stays with sortable transforms or we hit max update depth
      if (!fromColumn || !overColumn || fromColumn === overColumn) {
        return current
      }

      const position = dropPosition(
        groupStories(current),
        activeId,
        String(overId),
        overColumn
      )
      return placeStory(current, activeId, overColumn, position)
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id
    if (overId && onMove && !disabled && activeId) {
      const overColumn = columnFor(draft, overId)
      if (overColumn) {
        const position = dropPosition(
          grouped,
          activeId,
          String(overId),
          overColumn
        )
        setDraft(placeStory(draft, activeId, overColumn, position))
        onMove({ storyId: activeId, status: overColumn, position })
      }
    }

    setActiveId(null)
  }

  function handleDragCancel() {
    // Drop was aborted so restore the last saved order
    setDraft(stories)
    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={detectDrop}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3"
        role="group"
        aria-label="Story board"
      >
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            stories={grouped[column.id]}
            disabled={disabled || !onMove}
          />
        ))}
      </div>
      {/* Follows the pointer while the source card stays an empty gap */}
      <DragOverlay>
        {activeStory ? <KanbanCardOverlay story={activeStory} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
