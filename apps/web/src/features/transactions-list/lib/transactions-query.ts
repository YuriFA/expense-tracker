import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'
import type { TransactionType } from '@/entities/transaction/types'
import { currentDay, parseCalendarDate, type DateValue } from '@/shared/lib/date'

export type TransactionsFilters = {
  fromDate?: DateValue
  toDate?: DateValue
  type?: TransactionType
  accountId?: string
  categoryId?: string
}

const TRANSACTION_TYPES = new Set<TransactionType>(['expense', 'income', 'transfer'])

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

const parseDateOrFallback = (value: string | null | undefined, fallback: DateValue) => {
  if (!value) {
    return fallback
  }

  try {
    return parseCalendarDate(value)
  } catch {
    return fallback
  }
}

const parseOptionalString = (value: QueryParamValue) => {
  const normalized = getQueryValue(value)

  return normalized && normalized.length > 0 ? normalized : undefined
}

export const parseTransactionsQuery = (query: LocationQuery): TransactionsFilters => {
  const fromValue = getQueryValue(query.from)
  const toValue = getQueryValue(query.to)
  const type = parseOptionalString(query.type)

  const fromDate = fromValue ? parseDateOrFallback(fromValue, currentDay()) : undefined
  const toDate = toValue ? parseDateOrFallback(toValue, currentDay()) : undefined

  return {
    fromDate,
    toDate,
    type: isTransactionType(type) ? type : undefined,
    accountId: parseOptionalString(query.accountId),
    categoryId: parseOptionalString(query.categoryId),
  }
}

export const serializeTransactionsQuery = (
  filters: Partial<TransactionsFilters>,
): LocationQueryRaw => {
  return {
    from: filters.fromDate?.toString(),
    to: filters.toDate?.toString(),
    type: filters.type,
    accountId: filters.accountId || undefined,
    categoryId: filters.categoryId || undefined,
  }
}
