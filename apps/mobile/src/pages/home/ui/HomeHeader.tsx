import { useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Text } from '@shared/ui'
import { formatAmount } from '@shared/lib/format'
import { useSettingsStore } from '@shared/store/use-settings-store'
import { useAccounts } from '@entities/account'
import { APP_DISPLAY_NAME } from '@shared/config/app'
import type { CurrencyCode } from '@expense-tracker/money'
import type { AppLocale } from '@expense-tracker/i18n'

const INTL_LOCALE: Record<AppLocale, string> = { en: 'en-US', ru: 'ru-RU' }

/**
 * Compact home header (design section 7): app name + current date on one line,
 * and the total balance across accounts beneath it - grouped by currency, one
 * line per currency, secondary visual weight (NOT a hero balance).
 */
export function HomeHeader() {
  const { t } = useTranslation()
  const locale = useSettingsStore((state) => state.locale)
  const { data: accounts } = useAccounts()

  const totals = useMemo(() => {
    const byCurrency = new Map<CurrencyCode, number>()
    for (const account of accounts ?? []) {
      byCurrency.set(account.currency, (byCurrency.get(account.currency) ?? 0) + account.balance)
    }
    return [...byCurrency.entries()]
  }, [accounts])

  const dateLabel = new Date().toLocaleDateString(INTL_LOCALE[locale], {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })

  return (
    <View style={styles.container}>
      <View style={styles.meta}>
        <Text size="label" weight={600}>
          {APP_DISPLAY_NAME}
        </Text>
        <Text size="caption" tone="muted">
          {dateLabel}
        </Text>
      </View>
      {totals.length > 0 ? (
        <View style={styles.balances}>
          {totals.map(([currency, total]) => (
            <View key={currency} style={styles.balanceRow}>
              <Text size="caption" tone="muted" style={styles.balanceLabel}>
                {t('home.balance')}
              </Text>
              <Text size="title" weight={600} tabular>
                {formatAmount(total, currency, locale)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  balances: {
    gap: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  balanceLabel: {},
})
