import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/entities/transaction'
import {
  matchesTransactionsFilters,
  parseTransactionsQuery,
  serializeTransactionsQuery,
  type TransactionsFilters,
} from './transactions-query'

describe('parseTransactionsQuery', () => {
  it('returns empty filters for empty query', () => {
    expect(parseTransactionsQuery({})).toEqual({})
  })

  it('parses fromDate as CalendarDay', () => {
    const result = parseTransactionsQuery({ from: '2024-01-15' })
    expect(result.fromDate).toBe('2024-01-15')
  })

  it('parses toDate as CalendarDay', () => {
    const result = parseTransactionsQuery({ to: '2024-02-20' })
    expect(result.toDate).toBe('2024-02-20')
  })

  it('falls back to currentDay for invalid fromDate', () => {
    const result = parseTransactionsQuery({ from: 'invalid-date' })
    expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('falls back to currentDay for invalid toDate', () => {
    const result = parseTransactionsQuery({ to: 'invalid-date' })
    expect(result.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('parses valid transaction type', () => {
    expect(parseTransactionsQuery({ type: 'income' }).type).toBe('income')
    expect(parseTransactionsQuery({ type: 'expense' }).type).toBe('expense')
    expect(parseTransactionsQuery({ type: 'transfer' }).type).toBe('transfer')
  })

  it('returns undefined for invalid transaction type', () => {
    expect(parseTransactionsQuery({ type: 'invalid' }).type).toBeUndefined()
  })

  it('parses a single accountId into a one-element list', () => {
    expect(parseTransactionsQuery({ accountId: 'a1' }).accountIds).toEqual(['a1'])
  })

  it('parses repeated accountIds into a list', () => {
    expect(parseTransactionsQuery({ accountId: ['a1', 'a2'] }).accountIds).toEqual(['a1', 'a2'])
  })

  it('returns undefined for empty accountId', () => {
    expect(parseTransactionsQuery({ accountId: '' }).accountIds).toBeUndefined()
  })

  it('parses a single categoryId into a one-element list', () => {
    expect(parseTransactionsQuery({ categoryId: 'c1' }).categoryIds).toEqual(['c1'])
  })

  it('parses repeated categoryIds into a list', () => {
    expect(parseTransactionsQuery({ categoryId: ['c1', 'c2'] }).categoryIds).toEqual(['c1', 'c2'])
  })

  it('returns undefined for empty categoryId', () => {
    expect(parseTransactionsQuery({ categoryId: '' }).categoryIds).toBeUndefined()
  })

  it('uses first value when scalar query param is an array', () => {
    const result = parseTransactionsQuery({ from: ['2024-01-15', '2024-02-20'] })
    expect(result.fromDate).toBe('2024-01-15')
  })

  it('parses all filters together', () => {
    const result = parseTransactionsQuery({
      from: '2024-01-01',
      to: '2024-01-31',
      type: 'expense',
      accountId: ['a1', 'a2'],
      categoryId: 'c1',
    })
    expect(result).toEqual({
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'expense',
      accountIds: ['a1', 'a2'],
      categoryIds: ['c1'],
    })
  })
})

describe('serializeTransactionsQuery', () => {
  it('serializes empty filters', () => {
    expect(serializeTransactionsQuery({})).toEqual({})
  })

  it('serializes fromDate', () => {
    expect(serializeTransactionsQuery({ fromDate: '2024-01-15' })).toEqual({ from: '2024-01-15' })
  })

  it('serializes toDate', () => {
    expect(serializeTransactionsQuery({ toDate: '2024-01-15' })).toEqual({ to: '2024-01-15' })
  })

  it('serializes type', () => {
    expect(serializeTransactionsQuery({ type: 'income' })).toEqual({ type: 'income' })
  })

  it('serializes accountIds as a repeated param', () => {
    expect(serializeTransactionsQuery({ accountIds: ['a1', 'a2'] })).toEqual({
      accountId: ['a1', 'a2'],
    })
  })

  it('serializes categoryIds as a repeated param', () => {
    expect(serializeTransactionsQuery({ categoryIds: ['c1'] })).toEqual({ categoryId: ['c1'] })
  })

  it('uses undefined for an empty accountIds list', () => {
    expect(serializeTransactionsQuery({ accountIds: [] }).accountId).toBeUndefined()
  })

  it('uses undefined for an empty categoryIds list', () => {
    expect(serializeTransactionsQuery({ categoryIds: [] }).categoryId).toBeUndefined()
  })

  it('serializes all filters together', () => {
    const filters: TransactionsFilters = {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'expense',
      accountIds: ['a1'],
      categoryIds: ['c1'],
    }
    expect(serializeTransactionsQuery(filters)).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
      type: 'expense',
      accountId: ['a1'],
      categoryId: ['c1'],
    })
  })

  it('roundtrips via parseTransactionsQuery for valid filters', () => {
    const original: TransactionsFilters = {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'income',
      accountIds: ['a1', 'a2'],
      categoryIds: ['c1'],
    }
    const serialized = serializeTransactionsQuery(original)
    const parsed = parseTransactionsQuery(serialized as never)
    expect(parsed).toEqual(original)
  })
})

describe('matchesTransactionsFilters', () => {
  const cashflow = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: 't1',
      type: 'expense',
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      accountId: 'a1',
      categoryId: 'c1',
      version: 1,
      ...overrides,
    }) as Transaction

  const transfer = (overrides: Partial<Transaction> = {}): Transaction =>
    ({
      id: 't2',
      type: 'transfer',
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      fromAccountId: 'a1',
      toAccountId: 'a2',
      version: 1,
      ...overrides,
    }) as Transaction

  it('matches everything without filters', () => {
    expect(matchesTransactionsFilters(cashflow(), {})).toBe(true)
    expect(matchesTransactionsFilters(transfer(), {})).toBe(true)
  })

  it('matches a cashflow transaction touching one of the selected accounts', () => {
    const filters: TransactionsFilters = { accountIds: ['a9', 'a1'] }
    expect(matchesTransactionsFilters(cashflow(), filters)).toBe(true)
  })

  it('rejects a cashflow transaction on an unselected account', () => {
    const filters: TransactionsFilters = { accountIds: ['a9'] }
    expect(matchesTransactionsFilters(cashflow(), filters)).toBe(false)
  })

  it('matches a transfer through either side of the selected account', () => {
    const filtersFrom: TransactionsFilters = { accountIds: ['a1'] }
    const filtersTo: TransactionsFilters = { accountIds: ['a2'] }
    expect(matchesTransactionsFilters(transfer(), filtersFrom)).toBe(true)
    expect(matchesTransactionsFilters(transfer(), filtersTo)).toBe(true)
  })

  it('matches a cashflow transaction in one of the selected categories', () => {
    const filters: TransactionsFilters = { categoryIds: ['c9', 'c1'] }
    expect(matchesTransactionsFilters(cashflow(), filters)).toBe(true)
  })

  it('rejects a cashflow transaction outside the selected categories', () => {
    const filters: TransactionsFilters = { categoryIds: ['c9'] }
    expect(matchesTransactionsFilters(cashflow(), filters)).toBe(false)
  })

  it('rejects transfers when a category selection is active (no category)', () => {
    const filters: TransactionsFilters = { categoryIds: ['c1'] }
    expect(matchesTransactionsFilters(transfer(), filters)).toBe(false)
  })

  it('combines both selections conjunctively', () => {
    const filters: TransactionsFilters = { accountIds: ['a1'], categoryIds: ['c9'] }
    expect(matchesTransactionsFilters(cashflow(), filters)).toBe(false)
  })

  it('matches account-less cashflow via the «Без счета» sentinel id', () => {
    const none: TransactionsFilters = { accountIds: ['__no_account__'] }
    expect(matchesTransactionsFilters(cashflow({ accountId: null }), none)).toBe(true)
    expect(matchesTransactionsFilters(cashflow(), none)).toBe(false)
    expect(matchesTransactionsFilters(transfer(), none)).toBe(false)
  })

  it('treats «Без счета» as one more selectable source next to accounts', () => {
    const mixed: TransactionsFilters = { accountIds: ['__no_account__', 'a1'] }
    expect(matchesTransactionsFilters(cashflow({ accountId: null }), mixed)).toBe(true)
    expect(matchesTransactionsFilters(cashflow(), mixed)).toBe(true)
  })
})
