import { describe, it, expect } from 'vitest'
import {
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

  it('parses accountId', () => {
    expect(parseTransactionsQuery({ accountId: 'a1' }).accountId).toBe('a1')
  })

  it('returns undefined for empty accountId', () => {
    expect(parseTransactionsQuery({ accountId: '' }).accountId).toBeUndefined()
  })

  it('parses categoryId', () => {
    expect(parseTransactionsQuery({ categoryId: 'c1' }).categoryId).toBe('c1')
  })

  it('returns undefined for empty categoryId', () => {
    expect(parseTransactionsQuery({ categoryId: '' }).categoryId).toBeUndefined()
  })

  it('uses first value when query param is an array', () => {
    const result = parseTransactionsQuery({ from: ['2024-01-15', '2024-02-20'] })
    expect(result.fromDate).toBe('2024-01-15')
  })

  it('parses all filters together', () => {
    const result = parseTransactionsQuery({
      from: '2024-01-01',
      to: '2024-01-31',
      type: 'expense',
      accountId: 'a1',
      categoryId: 'c1',
    })
    expect(result).toEqual({
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'expense',
      accountId: 'a1',
      categoryId: 'c1',
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

  it('serializes accountId', () => {
    expect(serializeTransactionsQuery({ accountId: 'a1' })).toEqual({ accountId: 'a1' })
  })

  it('serializes categoryId', () => {
    expect(serializeTransactionsQuery({ categoryId: 'c1' })).toEqual({ categoryId: 'c1' })
  })

  it('uses undefined for empty accountId', () => {
    expect(serializeTransactionsQuery({ accountId: '' }).accountId).toBeUndefined()
  })

  it('uses undefined for empty categoryId', () => {
    expect(serializeTransactionsQuery({ categoryId: '' }).categoryId).toBeUndefined()
  })

  it('serializes all filters together', () => {
    const filters: TransactionsFilters = {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'expense',
      accountId: 'a1',
      categoryId: 'c1',
    }
    expect(serializeTransactionsQuery(filters)).toEqual({
      from: '2024-01-01',
      to: '2024-01-31',
      type: 'expense',
      accountId: 'a1',
      categoryId: 'c1',
    })
  })

  it('roundtrips via parseTransactionsQuery for valid filters', () => {
    const original: TransactionsFilters = {
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
      type: 'income',
      accountId: 'a1',
      categoryId: 'c1',
    }
    const serialized = serializeTransactionsQuery(original)
    const parsed = parseTransactionsQuery(serialized as never)
    expect(parsed).toEqual(original)
  })
})
