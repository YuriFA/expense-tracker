import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { Transaction, TransactionType } from '@/entities/transaction'
import {
  currentDay,
  parseCalendarDayOrFallback,
  type CalendarDay,
} from '@/shared/lib/date'

export type TransactionsFilters = {
  fromDate?: CalendarDay
  toDate?: CalendarDay
  type?: TransactionType
  /** Multi-select: transactions touching ANY of these accounts. */
  accountIds?: string[]
  /** Multi-select: transactions with ANY of these categories. */
  categoryIds?: string[]
}

const TRANSACTION_TYPES = new Set<TransactionType>([
  'expense',
  'income',
  'transfer',
  'adjustment',
])

type QueryParamValue = LocationQueryValue | LocationQueryValue[] | undefined

const getQueryValue = (value: QueryParamValue) => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value ?? undefined
}

const isTransactionType = (value: string | undefined): value is TransactionType => {
  return value !== undefined && TRANSACTION_TYPES.has(value as TransactionType)
}

const parseOptionalString = (value: QueryParamValue) => {
  const normalized = getQueryValue(value)

  return normalized && normalized.length > 0 ? normalized : undefined
}

/** Repeated (`?a=1&a=2`) or single (`?a=1`) query values to a clean id list. */
const parseOptionalStringList = (value: QueryParamValue) => {
  const raw = Array.isArray(value) ? value : [value]
  const ids = raw.filter((item): item is string => !!item && item.length > 0)

  return ids.length > 0 ? ids : undefined
}

export const parseTransactionsQuery = (query: LocationQuery): TransactionsFilters => {
  const fromValue = getQueryValue(query.from)
  const toValue = getQueryValue(query.to)
  const type = parseOptionalString(query.type)

  const fromDate = fromValue ? parseCalendarDayOrFallback(fromValue, currentDay()) : undefined
  const toDate = toValue ? parseCalendarDayOrFallback(toValue, currentDay()) : undefined

  return {
    fromDate,
    toDate,
    type: isTransactionType(type) ? type : undefined,
    accountIds: parseOptionalStringList(query.accountId),
    categoryIds: parseOptionalStringList(query.categoryId),
  }
}

export const serializeTransactionsQuery = (
  filters: Partial<TransactionsFilters>,
): LocationQueryRaw => {
  return {
    from: filters.fromDate?.toString(),
    to: filters.toDate?.toString(),
    type: filters.type,
    accountId: filters.accountIds?.length ? filters.accountIds : undefined,
    categoryId: filters.categoryIds?.length ? filters.categoryIds : undefined,
  }
}

/**
 * Client-side multi-select narrowing on top of the repository query (which
 * stays single/id-free): transfers match an account when they touch it on
 * either side — the same semantics as the repository's own account filter.
 */
export const matchesTransactionsFilters = (
  transaction: Transaction,
  filters: TransactionsFilters,
): boolean => {
  if (filters.accountIds?.length) {
    const touches = (accountId: string) =>
      transaction.type === 'transfer'
        ? transaction.fromAccountId === accountId || transaction.toAccountId === accountId
        : transaction.accountId === accountId

    if (!filters.accountIds.some(touches)) {
      return false
    }
  }

  if (filters.categoryIds?.length) {
    // Transfers and adjustments carry no category, so any category
    // selection excludes them.
    const matches =
      (transaction.type === 'income' || transaction.type === 'expense') &&
      filters.categoryIds.includes(transaction.categoryId)

    if (!matches) {
      return false
    }
  }

  return true
}
