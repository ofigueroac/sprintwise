import { describe, expect, it } from 'vitest'

import { ResumeRunBodySchema, ResumeRunIdsSchema } from './resume'

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

  it('accepts uuid project and run ids', () => {
    const ids = {
      projectId: '11111111-1111-4111-8111-111111111111',
      runId: '22222222-2222-4222-8222-222222222222',
    }

    expect(ResumeRunIdsSchema.parse(ids)).toEqual(ids)
    expect(ResumeRunIdsSchema.safeParse({ projectId: 'nope' }).success).toBe(
      false
    )
  })
})
