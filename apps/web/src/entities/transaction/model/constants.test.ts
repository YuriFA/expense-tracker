import { describe, expect, it } from 'vitest'
import { getAddTransactionTypeOptions, getTransactionTypeOptions } from './constants'

// Spec (web-screens): the reconcile dialog is the only creation surface for
// adjustments; the generic add-transaction flow offers expense/income/transfer
// only, while the type filter covers all four types.
describe('transaction type options', () => {
  it('filter options cover all four types including adjustment', () => {
    expect(getTransactionTypeOptions().map((o) => o.value)).toEqual([
      'expense',
      'income',
      'transfer',
      'adjustment',
    ])
  })

  it('add-transaction options offer the three manually creatable types only', () => {
    expect(getAddTransactionTypeOptions().map((o) => o.value)).toEqual([
      'expense',
      'income',
      'transfer',
    ])
  })

  it('every option carries a non-empty label', () => {
    const all = [...getTransactionTypeOptions(), ...getAddTransactionTypeOptions()]
    expect(all.map((o) => o.label).every(Boolean)).toBe(true)
  })
})
