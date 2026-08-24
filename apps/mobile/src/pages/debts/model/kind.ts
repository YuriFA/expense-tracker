// Per-direction presentation for the debts screen: RU wording and testID
// stems, mirroring the cashflow-overview `kind.ts` pattern.
// TODO(i18n): RU strings are hardcoded until react-i18next is wired.

import type { DebtDirection, DebtOperationKind } from '@expense-tracker/api'

interface DebtDirectionCopy {
  /** Summary row label: «Мне должны» / «Я должен». */
  summaryLabel: string
  /** Section header: «МНЕ ДОЛЖНЫ» / «Я ДОЛЖЕН». */
  sectionTitle: string
  /** Section empty state when nobody holds a nonzero balance. */
  sectionEmpty: string
}

export const DEBT_DIRECTION_VIEWS: Record<DebtDirection, DebtDirectionCopy> = {
  receivable: {
    summaryLabel: 'Мне должны',
    sectionTitle: 'МНЕ ДОЛЖНЫ',
    sectionEmpty: 'Вам никто не должен',
  },
  payable: {
    summaryLabel: 'Я должен',
    sectionTitle: 'Я ДОЛЖЕН',
    sectionEmpty: 'Вы никому не должны',
  },
}

/** Operation kind labels: «Долг» grows the owed amount, «Списание» shrinks it. */
export const DEBT_KIND_LABELS: Record<DebtOperationKind, string> = {
  debt: 'Долг',
  repayment: 'Списание',
}

export const DEBTS_COPY = {
  screenTitle: 'Долги',
  /** Screen-level CTA opening the operation form with both pickers active. */
  newOperation: 'Новая операция',
  addDebtor: 'Добавить должника',
  /** History sheet footer CTA (a repayment for that debtor and direction). */
  newRepayment: 'Новое списание',
  historyEmpty: 'Операций пока нет',
  emptyTitle: 'Долгов пока нет',
  emptyHint: 'Добавьте человека и запишите, кто кому должен — всё работает офлайн.',
  /** Over-repayment warning in the operation form (warn, never block). */
  overRepayment: (remaining: string) =>
    `Списание больше остатка долга (${remaining}). Баланс станет отрицательным.`,
} as const
