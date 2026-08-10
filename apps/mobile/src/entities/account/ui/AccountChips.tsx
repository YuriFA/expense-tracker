import { ScrollView, StyleSheet } from 'react-native'
import { Chip } from '@shared/ui'
import type { AccountWithBalance } from '@expense-tracker/api'

interface AccountChipsProps {
  accounts: AccountWithBalance[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** A11y label for the chip group. */
  accessibilityLabel?: string
}

/**
 * Horizontally scrollable account chips (design section 7: "quick account
 * pick"). One row of selectable pills; the selected account takes the ink fill.
 * Touch targets are >= 44pt (chips are bumped from the base 36pt). The canonical
 * account picker, reused by the Home cashflow form, the transfer From/To
 * selectors, and (later) the Transactions filter.
 */
export function AccountChips({
  accounts,
  selectedId,
  onSelect,
  accessibilityLabel,
}: AccountChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      contentContainerStyle={styles.content}
    >
      {accounts.map((account) => (
        <Chip
          key={account.id}
          selected={account.id === selectedId}
          onPress={() => onSelect(account.id)}
          style={styles.chip}
        >
          {account.name}
        </Chip>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 4,
  },
  // The base Chip is a 36pt pill; bump to the 44pt touch target floor here.
  chip: {
    minHeight: 44,
  },
})
