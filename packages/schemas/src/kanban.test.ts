import { describe, expect, it } from 'vitest'

import { RenderKanbanArgsSchema } from './kanban'

const card = {
  title: 'Book a walk',
  description: 'As a owner I want to book a walk so that my dog gets exercise.',
}

describe('RenderKanbanArgsSchema', () => {
  it('accepts story cards with a title and description', () => {
    const parsed = RenderKanbanArgsSchema.parse({
      cards: [card, { title: 'Pay online' }, { title: 'Leave a review' }],
    })

    expect(parsed.cards).toHaveLength(3)
    expect(parsed.cards[0]?.title).toBe('Book a walk')
    expect(parsed.cards[1]?.description).toBe('')
  })

  it('rejects fewer than three cards', () => {
    expect(
      RenderKanbanArgsSchema.safeParse({ cards: [card, card] }).success
    ).toBe(false)
  })
})
