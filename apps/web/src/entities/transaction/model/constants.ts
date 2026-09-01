import i18n from '@/shared/i18n'
import type { TransactionType } from './types'

export type TransactionTypeOption = { label: string; value: TransactionType }

// All four transaction types, for read-model UI: type filter, active-filter
// chips, history badges. Includes adjustment.
export function getTransactionTypeOptions(): TransactionTypeOption[] {
  const { t } = i18n.global

  return [
    { label: t('transactions.types.expense'), value: 'expense' },
    { label: t('transactions.types.income'), value: 'income' },
    { label: t('transactions.types.transfer'), value: 'transfer' },
    { label: t('transactions.types.adjustment'), value: 'adjustment' },
  ]
}

// Types offered by the generic add-transaction flow. Adjustment is NOT here:
// the reconcile dialog is the only creation surface for it (web-screens spec,
// "No adjustment tab in the add-transaction flow"). Declared explicitly so a
// future type cannot silently leak into the create tabs.
export function getAddTransactionTypeOptions(): TransactionTypeOption[] {
  const { t } = i18n.global

  return [
    { label: t('transactions.types.expense'), value: 'expense' },
    { label: t('transactions.types.income'), value: 'income' },
    { label: t('transactions.types.transfer'), value: 'transfer' },
  ]
}
