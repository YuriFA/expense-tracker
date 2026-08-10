import { useTranslation } from 'react-i18next'
import { ListRow, Text } from '@shared/ui'
import { formatAmount, formatDate } from '@shared/lib/format'
import { useSettingsStore } from '@shared/store/use-settings-store'
import type { CurrencyCode } from '@expense-tracker/money'
import { isTransferTransaction } from '@expense-tracker/api'
import type { AccountWithBalance, Category, Transaction } from '@expense-tracker/api'
import type { AppLocale } from '@expense-tracker/i18n'

const TRANSFER_ICON = '🔄'

interface TransactionListItemProps {
  transaction: Transaction
  /** Accounts, to resolve names + currency. Optional while loading. */
  accounts?: AccountWithBalance[]
  /** Categories, to resolve the cashflow title + icon. Optional while loading. */
  categories?: Category[]
  /**
   * Append a compact date to the subtitle (the full Transactions history shows
   * dates; the Home recent list does not). Defaults to false to keep the Home
   * row unchanged.
   */
  showDate?: boolean
}

/**
 * A single transaction row (design section 9 "list row"). The canonical item
 * reused by the Home recent list and the Transactions screen: leading category
 * icon, primary title, secondary subtitle, trailing amount.
 *
 * Per the mobile design the only saturated chrome color is destructive red, so
 * amounts are foreground-toned with a direction sign (+ income / - expense);
 * no green/red coloring. Money is formatted with tabular numerals in the
 * account's currency.
 */
export function TransactionListItem({
  transaction,
  accounts,
  categories,
  showDate = false,
}: TransactionListItemProps) {
  const { t } = useTranslation()
  const locale = useSettingsStore((state) => state.locale) as AppLocale
  const fallbackCurrency = useSettingsStore((state) => state.currency)

  const accountName = (id: string | undefined): string =>
    accounts?.find((account) => account.id === id)?.name ?? ''
  const accountCurrency = (id: string | undefined): CurrencyCode =>
    accounts?.find((account) => account.id === id)?.currency ?? fallbackCurrency

  if (isTransferTransaction(transaction)) {
    const from = accountName(transaction.fromAccountId)
    const to = accountName(transaction.toAccountId)
    const currency = accountCurrency(transaction.fromAccountId)
    const route = from && to ? `${from} → ${to}` : t('transactions.types.transfer')
    const datePart = showDate ? formatDate(transaction.occurredAt, locale) : ''
    const subtitle = transaction.description
      ? datePart
        ? `${route} · ${datePart}`
        : route
      : datePart

    return (
      <ListRow
        leading={<Text size="title">{TRANSFER_ICON}</Text>}
        trailing={<RowTrailing amount={transaction.amount} currency={currency} locale={locale} />}
        divider={false}
      >
        <Text weight={500} numberOfLines={1}>
          {transaction.description || route}
        </Text>
        {subtitle ? (
          <Text size="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </ListRow>
    )
  }

  const category = categories?.find((item) => item.id === transaction.categoryId)
  const currency = accountCurrency(transaction.accountId)
  const categoryName = category?.name ?? t(`transactions.types.${transaction.type}`)
  const account = accountName(transaction.accountId)
  const primary = transaction.description || categoryName
  const datePart = showDate ? formatDate(transaction.occurredAt, locale) : ''
  const baseSecondary = transaction.description
    ? `${categoryName} · ${account}`.trim()
    : account || categoryName
  const secondary = datePart ? `${baseSecondary} · ${datePart}` : baseSecondary

  return (
    <ListRow
      leading={<Text size="title">{category?.icon ?? '💸'}</Text>}
      trailing={
        <RowTrailing
          amount={transaction.amount}
          currency={currency}
          locale={locale}
          sign={transaction.type === 'income' ? '+' : '−'}
        />
      }
      divider={false}
    >
      <Text weight={500} numberOfLines={1}>
        {primary}
      </Text>
      <Text size="caption" tone="muted" numberOfLines={1}>
        {secondary}
      </Text>
    </ListRow>
  )
}

interface RowTrailingProps {
  amount: number
  currency: CurrencyCode
  locale: AppLocale
  sign?: '+' | '−'
}

function RowTrailing({ amount, currency, locale, sign }: RowTrailingProps) {
  const formatted = formatAmount(amount, currency, locale)
  return (
    <Text weight={600} tabular>
      {sign ? `${sign} ${formatted}` : formatted}
    </Text>
  )
}
