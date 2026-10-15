'use client';

import { useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import type { Story, StoryStatus } from '@repo/schemas';

import { KanbanColumn, type KanbanColumnData } from './kanban-column';

const COLUMNS: KanbanColumnData[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'done', label: 'Done' },
];

export type KanbanMove = {
  storyId: string;
  status: StoryStatus;
  position: number;
};

export type KanbanBoardProps = {
  stories: Story[];
  onMove?: (data: KanbanMove) => void;
  disabled?: boolean;
};

export function KanbanBoard({ stories, onMove, disabled }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const grouped = useMemo(() => {
    const next: Record<StoryStatus, Story[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const story of stories) {
      next[story.status].push(story);
    }

    for (const column of COLUMNS) {
      next[column.id].sort((a, b) => a.position - b.position);
    }

    return next;
  }, [stories]);

  function handleDragEnd(event: DragEndEvent) {
    if (!onMove || disabled) {
      return;
    }

    const { active, over } = event;
    if (!over) {
      return;
    }

    const storyId = String(active.id);
    const overId = String(over.id);
    const overColumn = COLUMNS.some((column) => column.id === overId)
      ? (overId as StoryStatus)
      : stories.find((story) => story.id === overId)?.status;

    if (!overColumn) {
      return;
    }

    const siblings = grouped[overColumn].filter(
      (story) => story.id !== storyId
    );
    const overIndex = siblings.findIndex((story) => story.id === overId);
    const position = overIndex === -1 ? siblings.length : overIndex;

    onMove({ storyId, status: overColumn, position });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid gap-3 md:grid-cols-3"
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
    </DndContext>
  );
}
