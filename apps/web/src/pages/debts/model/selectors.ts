// Pure view-model helpers for the debts screen, ported from the mobile page
// selectors. Balances derive from the operation history via the package's
// balance helpers (never stored) - the debts capability's core rule.

import type { Debtor } from '@expense-tracker/api'
import { calendarDayKey, fullDayLabel } from '@expense-tracker/dates'
import type { DebtDirection, DebtOperation } from '@/entities/debt-operation'
import { balanceInDirection } from '@/entities/debt-operation'

interface DebtorView {
  debtor: Debtor
  balance: number
}

export interface DebtorSectionViews {
  /** Nonzero balances, sorted by balance desc, ties by name. */
  visible: DebtorView[]
  /** Zero balances (settled), sorted by name. */
  settled: DebtorView[]
}

/**
 * One direction's debtor list. Membership requires at least one operation in
 * that direction - a payable-only debtor never appears under «Owed to me»,
 * not even settled. No netting across directions.
 */
export function debtorSection(
  debtors: readonly Debtor[],
  operations: readonly DebtOperation[],
  direction: DebtDirection,
): DebtorSectionViews {
  const inDirection = new Set(
    operations.filter((operation) => operation.direction === direction).map((op) => op.debtorId),
  )
  const visible: DebtorView[] = []
  const settled: DebtorView[] = []
  for (const debtor of debtors) {
    if (!inDirection.has(debtor.id)) continue
    const balance = balanceInDirection(operations, debtor.id, direction)
    ;(balance === 0 ? settled : visible).push({ debtor, balance })
  }
  visible.sort(
    (a, b) => b.balance - a.balance || a.debtor.name.localeCompare(b.debtor.name),
  )
  settled.sort((a, b) => a.debtor.name.localeCompare(b.debtor.name))
  return { visible, settled }
}

export interface DebtorHistoryGroup {
  key: string
  title: string
  operations: DebtOperation[]
}

/** Day-grouped operation history of one debtor+direction, newest first. */
export function debtorHistoryGroups(
  operations: readonly DebtOperation[],
  debtorId: string,
  direction: DebtDirection,
  locale: string,
): DebtorHistoryGroup[] {
  const own = operations
    .filter((op) => op.debtorId === debtorId && op.direction === direction)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
  const byDay = new Map<string, DebtOperation[]>()
  for (const operation of own) {
    const key = calendarDayKey(new Date(operation.occurredAt))
    byDay.set(key, [...(byDay.get(key) ?? []), operation])
  }
  return [...byDay.entries()].map(([key, dayOperations]) => ({
    key,
    title: fullDayLabel(new Date(dayOperations[0]!.occurredAt), locale),
    operations: dayOperations,
  }))
}

/** Initials of the first and last word, uppercased; '?' for an empty name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]![0]!
  const last = words.length > 1 ? words[words.length - 1]![0]! : ''
  return (first + last).toUpperCase()
}

/** The debtor's latest operation timestamp in one direction (null when none). */
export function lastOperationAt(
  operations: readonly DebtOperation[],
  debtorId: string,
  direction: DebtDirection,
): string | null {
  const own = operations.filter(
    (operation) => operation.debtorId === debtorId && operation.direction === direction,
  )
  if (own.length === 0) return null
  return own.reduce(
    (latest, operation) => (operation.occurredAt > latest ? operation.occurredAt : latest),
    own[0]!.occurredAt,
  )
}
