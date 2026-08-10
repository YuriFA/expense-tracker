import { useTranslation } from 'react-i18next'
import { ListRow, Text } from '@shared/ui'
import { formatAmount } from '@shared/lib/format'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { DEFAULT_CURRENCY as _fallback, type CurrencyCode } from '@expense-tracker/money'
import { isTransferTransaction } from '@expense-tracker/api'
import type { AccountWithBalance, Category, Transaction } from '@expense-tracker/api'

const TRANSFER_ICON = '🔄'

interface TransactionListItemProps {
  transaction: Transaction
  /** Accounts, to resolve names + currency. Optional while loading. */
  accounts?: AccountWithBalance[]
  /** Categories, to resolve the cashflow title + icon. Optional while loading. */
  categories?: Category[]
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
}: TransactionListItemProps) {
  const { t } = useTranslation()
  const locale = useSettingsStore((state) => state.locale)
  const fallbackCurrency = useSettingsStore((state) => state.currency) as CurrencyCode

  const accountName = (id: string | undefined): string =>
    accounts?.find((account) => account.id === id)?.name ?? ''
  const accountCurrency = (id: string | undefined): CurrencyCode =>
    accounts?.find((account) => account.id === id)?.currency ?? fallbackCurrency

  if (isTransferTransaction(transaction)) {
    const from = accountName(transaction.fromAccountId)
    const to = accountName(transaction.toAccountId)
    const currency = accountCurrency(transaction.fromAccountId)
    const title = from && to ? `${from} → ${to}` : t('transactions.types.transfer')

    return (
      <ListRow
        leading={<Text size="title">{TRANSFER_ICON}</Text>}
        divider={false}
      >
        <Text weight={500} numberOfLines={1}>
          {transaction.description || title}
        </Text>
        <Text size="caption" tone="muted" numberOfLines={1}>
          {title}
        </Text>
        <RowTrailing
          amount={transaction.amount}
          currency={currency}
          locale={locale}
          sign={null}
        />
      </ListRow>
    )
  }

  const category = categories?.find((item) => item.id === transaction.categoryId)
  const currency = accountCurrency(transaction.accountId)
  const title = category?.name ?? t(`transactions.types.${transaction.type}`)
  const subtitle = accountName(transaction.accountId)

  return (
    <ListRow leading={<Text size="title">{category?.icon ?? '💸'}</Text>} divider={false}>
      <Text weight={500} numberOfLines={1}>
        {transaction.description || title}
      </Text>
      <Text size="caption" tone="muted" numberOfLines={1}>
        {subtitle || title}
      </Text>
      <RowTrailing
        amount={transaction.amount}
        currency={currency}
        locale={locale}
        sign={transaction.type === 'income' ? '+' : '−'}
      />
    </ListRow>
  )
}

interface RowTrailingProps {
  amount: number
  currency: CurrencyCode
  locale: 'en' | 'ru'
  sign: '+' | '−' | null
}

function RowTrailing({ amount, currency, locale, sign }: RowTrailingProps) {
  const formatted = formatAmount(amount, currency, locale)
  return (
    <Text weight={600} tabular>
      {sign ? `${sign} ${formatted}` : formatted}
    </Text>
  )
}
