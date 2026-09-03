// Pure builder of the transactions CSV export. Format contract (mirrors the
// import template, `web-data-transfer`): `;`-separated, decimal comma, fixed
// Russian headers parsed by name, dates DD.MM.YYYY, unsigned amounts for the
// classic types (the type column carries the direction), signed for
// adjustments. Accounts render by name («Без счета» for account-less rows),
// transfers as `from → to`.

import type { Transaction } from '@/entities/transaction'
import type { Account } from '@/entities/account'
import type { Category } from '@/entities/category'

export const CSV_NO_ACCOUNT_LABEL = 'Без счета'

const TYPE_LABELS = {
  income: 'доход',
  expense: 'расход',
  transfer: 'перевод',
  adjustment: 'корректировка',
} as const

/** Minor units -> `1234,56` (decimal comma, no grouping, no sign padding). */
function formatMajor(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const abs = Math.abs(amount)
  const whole = Math.floor(abs / 100)
  const fraction = abs % 100
  return `${sign}${whole}.${String(fraction).padStart(2, '0')}`.replace('.', ',')
}

/** ISO datetime -> `DD.MM.YYYY` (UTC, matching the import template). */
function formatDate(iso: string): string {
  const [day, month, year] = new Date(iso).toISOString().slice(0, 10).split('-').reverse()
  return `${day}.${month}.${year}`
}

/** RFC-4180 quoting: wrap in quotes when the value carries a delimiter,
 * quote, or line break; inner quotes double. */
function escapeField(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export interface TransactionsCsvContext {
  accounts?: Account[]
  categories?: Category[]
}

export function buildTransactionsCsv(
  transactions: readonly Transaction[],
  context: TransactionsCsvContext = {},
): string {
  const accountName = (id: string) =>
    context.accounts?.find((account) => account.id === id)?.name ?? id
  const categoryName = (id: string) =>
    context.categories?.find((category) => category.id === id)?.name ?? id

  const rows = transactions.map((transaction) => {
    const account =
      transaction.type === 'transfer'
        ? `${accountName(transaction.fromAccountId)} → ${accountName(transaction.toAccountId)}`
        : transaction.accountId === null
          ? CSV_NO_ACCOUNT_LABEL
          : accountName(transaction.accountId)
    const category =
      transaction.type === 'income' || transaction.type === 'expense'
        ? categoryName(transaction.categoryId)
        : ''
    // Adjustments keep their sign (reconciliation delta); the classic types
    // are unsigned in the file — the type column carries the direction.
    const amount =
      transaction.type === 'adjustment'
        ? formatMajor(transaction.amount)
        : formatMajor(Math.abs(transaction.amount))

    return [
      formatDate(transaction.occurredAt),
      TYPE_LABELS[transaction.type],
      category,
      account,
      amount,
      transaction.description ?? '',
    ]
      .map(escapeField)
      .join(';')
  })

  return ['дата;тип;категория;счёт;сумма;примечание', ...rows].join('\r\n')
}
