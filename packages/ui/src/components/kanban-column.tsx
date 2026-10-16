'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { Story, StoryStatus } from '@repo/schemas'

import { KanbanCard } from './kanban-card'

export type KanbanColumnData = {
  id: StoryStatus
  label: string
}

export function KanbanColumn({
  column,
  stories,
  disabled,
}: {
  column: KanbanColumnData
  stories: Story[]
  disabled: boolean
}) {
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <section
      ref={setNodeRef}
      aria-label={column.label}
      className="bg-muted/40 flex min-h-48 min-w-0 flex-col gap-2 overflow-hidden rounded-lg border p-3"
    >
      <h2 className="text-sm font-medium">{column.label}</h2>
      <SortableContext
        items={stories.map((story) => story.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-w-0 flex-col gap-2">
          {stories.map((story) => (
            <KanbanCard key={story.id} story={story} disabled={disabled} />
          ))}
        </ul>
      </SortableContext>
    </section>
  )
}
