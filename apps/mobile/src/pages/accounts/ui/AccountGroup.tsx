import { View, StyleSheet } from 'react-native'
import type { AccountWithBalance } from '@expense-tracker/api'
import type { AppLocale } from '@expense-tracker/i18n'
import { ListRow, Text, useTokens } from '@shared/ui'
import { formatAmount } from '@shared/lib/format'
import type { AccountCurrencyGroup } from '../model/grouping'

interface AccountGroupProps {
  group: AccountCurrencyGroup
  locale: AppLocale
  onAccountPress: (account: AccountWithBalance) => void
}

/**
 * A currency section of the Accounts list (design section 7): a section header
 * with the currency code + the per-currency total, and a surface "card"
 * containing the account rows. Balances are minor units rendered with tabular
 * numerals; the card groups the rows with hairline dividers (the canonical
 * `ListRow`).
 */
export function AccountGroup({ group, locale, onAccountPress }: AccountGroupProps) {
  const tokens = useTokens()
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text size="label" weight={600} tone="muted">
          {group.currency}
        </Text>
        <Text size="title" weight={600} tabular>
          {formatAmount(group.total, group.currency, locale)}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
        {group.accounts.map((account, index) => (
          <AccountRow
            key={account.id}
            account={account}
            locale={locale}
            onPress={() => onAccountPress(account)}
            divider={index < group.accounts.length - 1}
          />
        ))}
      </View>
    </View>
  )
}

interface AccountRowProps {
  account: AccountWithBalance
  locale: AppLocale
  onPress: () => void
  divider: boolean
}

function AccountRow({ account, locale, onPress, divider }: AccountRowProps) {
  const tokens = useTokens()
  const initial = account.name.trim().charAt(0).toUpperCase() || account.currency.charAt(0)
  return (
    <ListRow
      onPress={onPress}
      divider={divider}
      leading={
        <View style={[styles.avatar, { backgroundColor: tokens.muted }]}>
          <Text size="label" weight={600}>
            {initial}
          </Text>
        </View>
      }
      trailing={
        <Text
          size="body"
          weight={600}
          tabular
          tone={account.balance < 0 ? 'destructive' : 'default'}
        >
          {formatAmount(account.balance, account.currency, locale)}
        </Text>
      }
    >
      <Text size="body" weight={500} numberOfLines={1}>
        {account.name}
      </Text>
    </ListRow>
  )
}

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
