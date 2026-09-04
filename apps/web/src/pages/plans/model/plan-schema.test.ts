import { describe, it, expect } from 'vitest'
import { createPlanSchema } from './plan-schema'

const valid = {
  amount: 599,
  name: 'Netflix',
  accountId: 'a1',
  categoryId: 'c1',
  nextDue: '2026-09-05',
  regularity: 'monthly',
  confirmMode: 'manual',
  reminder: 'off',
  note: '',
}

describe('plan form schema', () => {
  it('accepts a complete plan', () => {
    expect(createPlanSchema().safeParse(valid).success).toBe(true)
  })

  it('accepts a past next-due date (the plan starts out overdue)', () => {
    expect(createPlanSchema().safeParse({ ...valid, nextDue: '2020-01-01' }).success).toBe(true)
  })

  it('rejects a non-positive amount', () => {
    expect(createPlanSchema().safeParse({ ...valid, amount: 0 }).success).toBe(false)
    expect(createPlanSchema().safeParse({ ...valid, amount: -1 }).success).toBe(false)
  })

  it('requires live account and category selections', () => {
    expect(createPlanSchema().safeParse({ ...valid, accountId: '' }).success).toBe(false)
    expect(createPlanSchema().safeParse({ ...valid, categoryId: '' }).success).toBe(false)
  })

  it('rejects a malformed next-due date', () => {
    expect(createPlanSchema().safeParse({ ...valid, nextDue: '' }).success).toBe(false)
    expect(createPlanSchema().safeParse({ ...valid, nextDue: '05.09.2026' }).success).toBe(false)
  })

  it('keeps name and note optional (empty strings)', () => {
    expect(createPlanSchema().safeParse({ ...valid, name: '', note: '' }).success).toBe(true)
  })
})
