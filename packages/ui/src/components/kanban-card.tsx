'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Story } from '@repo/schemas'

import { cn } from '@repo/ui/lib/utils'

export type KanbanCardProps = {
  story: Story
  disabled: boolean
}

export function KanbanCard({ story, disabled }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id, disabled })

  return (
    <li
      ref={setNodeRef}
      // dnd-kit has to write transform on this node while the card moves
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'bg-background rounded-md border p-3 text-sm shadow-xs',
        isDragging && 'z-10 opacity-0'
      )}
    >
      <button
        type="button"
        className="w-full cursor-grab touch-none text-left select-none active:cursor-grabbing"
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
    <div className="bg-background rounded-md border p-3 text-sm shadow-md">
      <KanbanCardBody story={story} />
    </div>
  )
}

function KanbanCardBody({ story }: { story: Story }) {
  return (
    <>
      <span className="font-medium">{story.title}</span>
      {story.description ? (
        <span className="text-muted-foreground mt-1 block text-xs">
          {story.description}
        </span>
      ) : null}
    </>
  )
}
