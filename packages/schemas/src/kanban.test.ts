import { describe, expect, it } from 'vitest'

import { RenderKanbanArgsSchema } from './kanban'

const story = { title: 'Book a walk' }

describe('RenderKanbanArgsSchema', () => {
  it('accepts three to eight story drafts without ids', () => {
    const parsed = RenderKanbanArgsSchema.parse({
      stories: [story, { title: 'Pay online' }, { title: 'Leave a review' }],
    })

    expect(parsed.stories).toHaveLength(3)
    expect(parsed.stories[0]?.title).toBe('Book a walk')
    expect(parsed.stories[0]?.id).toBeUndefined()
  })

  it('rejects fewer than three stories', () => {
    expect(
      RenderKanbanArgsSchema.safeParse({ stories: [story, story] }).success
    ).toBe(false)
  })
})
