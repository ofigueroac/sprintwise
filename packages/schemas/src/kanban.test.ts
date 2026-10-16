import { describe, expect, it } from 'vitest'

import { RenderKanbanArgsSchema, storyStatusForMilestone } from './kanban'

const card = {
  title: 'Interview five buyers',
  description: 'Ask whether they would pay before a prototype exists.',
  milestone_category: 'Validation' as const,
  status: 'To Test' as const,
}

const columns = ['To Test', 'Building', 'Validated'] as const

describe('RenderKanbanArgsSchema', () => {
  it('accepts milestone cards and the three columns', () => {
    const parsed = RenderKanbanArgsSchema.parse({
      columns,
      cards: [
        card,
        { ...card, title: 'Landing page', milestone_category: 'Marketing' },
        {
          ...card,
          title: 'Ship the concierge',
          milestone_category: 'Execution',
          status: 'Building',
        },
      ],
    })

    expect(parsed.cards).toHaveLength(3)
    expect(parsed.cards[0]?.milestone_category).toBe('Validation')
    expect(parsed.columns).toEqual(['To Test', 'Building', 'Validated'])
  })

  it('rejects fewer than three cards', () => {
    expect(
      RenderKanbanArgsSchema.safeParse({ columns, cards: [card, card] }).success
    ).toBe(false)
  })

  it('maps milestone status onto the existing board columns', () => {
    expect(storyStatusForMilestone('To Test')).toBe('todo')
    expect(storyStatusForMilestone('Building')).toBe('in_progress')
    expect(storyStatusForMilestone('Validated')).toBe('done')
  })
})
