'use client'

import { useDndContext } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Story } from '@repo/schemas'

import { cn } from '@repo/ui/lib/utils'

export type KanbanCardProps = {
  story: Story
  disabled: boolean
}

export function KanbanCard({ story, disabled }: KanbanCardProps) {
  const { active } = useDndContext()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: story.id,
    disabled,
    animateLayoutChanges: () => false,
  })

  return (
    <li
      ref={setNodeRef}
      // Idle cards stay in document flow after a refresh remounts the board
      style={{
        transform: active ? CSS.Translate.toString(transform) : undefined,
        transition: active ? transition : undefined,
      }}
      className={cn(
        'bg-background min-w-0 overflow-hidden rounded-md border p-3 text-sm shadow-xs',
        isDragging && 'z-10 opacity-0'
      )}
    >
      <button
        type="button"
        className="w-full min-w-0 cursor-grab touch-none text-left select-none active:cursor-grabbing"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <KanbanCardBody story={story} />
      </button>
    </li>
  )
}

export function KanbanCardOverlay({ story }: { story: Story }) {
  return (
    <div className="bg-background min-w-0 overflow-hidden rounded-md border p-3 text-sm shadow-md">
      <KanbanCardBody story={story} />
    </div>
  )
}

function KanbanCardBody({ story }: { story: Story }) {
  return (
    <>
      <span className="block break-words font-medium">{story.title}</span>
      {story.description ? (
        <span className="text-muted-foreground mt-1 block break-words text-xs">
          {story.description}
        </span>
      ) : null}
    </>
  )
}
