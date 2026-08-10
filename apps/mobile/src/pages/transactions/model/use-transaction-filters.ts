import { useCallback, useMemo, useState } from 'react'
import type { TransactionQuery, TransactionType } from '@expense-tracker/api'
import { DEFAULT_DATE_RANGE, resolveDateRange, type DateRangePreset } from '../lib/date-range'

/**
 * UI-facing filter state for the Transactions screen. `dateRange` is a preset
 * (always defined) so the filter sheet can render a single-select chip row;
 * `all` is the "no date filter" state.
 */
export interface TransactionFilters {
  type: TransactionType | undefined
  accountId: string | undefined
  categoryId: string | undefined
  dateRange: DateRangePreset
}

/** Filters with nothing active - the default view. */
export const NO_FILTERS: TransactionFilters = {
  type: undefined,
  accountId: undefined,
  categoryId: undefined,
  dateRange: DEFAULT_DATE_RANGE,
}

export type FilterKey = 'type' | 'accountId' | 'categoryId' | 'dateRange'

/** True when every filter is at its default (no narrowing). */
export function isUnfiltered(filters: TransactionFilters): boolean {
  return (
    filters.type === undefined &&
    filters.accountId === undefined &&
    filters.categoryId === undefined &&
    filters.dateRange === DEFAULT_DATE_RANGE
  )
}

/**
 * Local filter state for the Transactions screen + the derived repository
 * `TransactionQuery`. Filters apply live (the query is recomputed on every
 * change), which is fine because the offline repository resolves instantly and
 * the active-filter chips always reflect the visible list.
 *
 * Changing the type clears the category: categories are typed (income/expense)
 * and a stale cross-type category would silently produce an empty list.
 */
export function useTransactionFilters() {
  const [filters, setFilters] = useState<TransactionFilters>(NO_FILTERS)

  const query = useMemo<TransactionQuery>(() => {
    const { fromDate, toDate } = resolveDateRange(filters.dateRange)
    return {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.accountId ? { accountId: filters.accountId } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
    }
  }, [filters])

  const activeCount = useMemo(() => {
    return (
      (filters.type ? 1 : 0) +
      (filters.accountId ? 1 : 0) +
      (filters.categoryId ? 1 : 0) +
      (filters.dateRange !== DEFAULT_DATE_RANGE ? 1 : 0)
    )
  }, [filters])

  const setType = useCallback((type: TransactionType | undefined) => {
    setFilters((current) => ({ ...current, type, categoryId: undefined }))
  }, [])

  const setAccountId = useCallback((accountId: string | undefined) => {
    setFilters((current) => ({ ...current, accountId }))
  }, [])

  const setCategoryId = useCallback((categoryId: string | undefined) => {
    setFilters((current) => ({ ...current, categoryId }))
  }, [])

  const setDateRange = useCallback((dateRange: DateRangePreset) => {
    setFilters((current) => ({ ...current, dateRange }))
  }, [])

  const clearFilter = useCallback((key: FilterKey) => {
    setFilters((current) => ({
      ...current,
      [key]: key === 'dateRange' ? DEFAULT_DATE_RANGE : undefined,
      // Clearing the type also frees a now-irrelevant category pick.
      ...(key === 'type' ? { categoryId: undefined } : {}),
    }))
  }, [])

  const resetAll = useCallback(() => {
    setFilters(NO_FILTERS)
  }, [])

  return {
    filters,
    query,
    activeCount,
    isUnfiltered: activeCount === 0,
    setType,
    setAccountId,
    setCategoryId,
    setDateRange,
    clearFilter,
    resetAll,
  }
}

export type TransactionFilterState = ReturnType<typeof useTransactionFilters>
