import { describe, expect, it } from 'vitest'

import { ResumeRunBodySchema } from './resume'

describe('ResumeRunBodySchema', () => {
  it('accepts approve and reject', () => {
    expect(ResumeRunBodySchema.parse({ approved: true })).toEqual({
      approved: true,
    })
    expect(ResumeRunBodySchema.parse({ approved: false })).toEqual({
      approved: false,
    })
  })

  it('rejects a missing or non boolean approved field', () => {
    expect(ResumeRunBodySchema.safeParse({}).success).toBe(false)
    expect(ResumeRunBodySchema.safeParse({ approved: 'yes' }).success).toBe(
      false
    )
  })
})
