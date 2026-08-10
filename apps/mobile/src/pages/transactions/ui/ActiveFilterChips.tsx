import { ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Ionicons } from '@expo/vector-icons'
import { Chip, useTokens } from '@shared/ui'
import type { AccountWithBalance, Category } from '@expense-tracker/api'
import type { TransactionFilters, FilterKey } from '../model/use-transaction-filters'
import type { DateRangePreset } from '../lib/date-range'

interface ActiveFilterChipsProps {
  filters: TransactionFilters
  accounts: AccountWithBalance[] | undefined
  categories: Category[] | undefined
  /** Remove a single filter by key. */
  onClear: (key: FilterKey) => void
}

interface ActiveFilter {
  key: FilterKey
  label: string
}

const DATE_RANGE_LABEL_KEY: Record<DateRangePreset, string> = {
  all: 'transactions.dateFilter.allTime',
  today: 'transactions.dateFilter.today',
  last30: 'transactions.dateFilter.last30Days',
  thisMonth: 'transactions.dateFilter.thisMonth',
}

/**
 * The active-filter chip rail (design section 7: "active filters shown as
 * chips"). One removable chip per active filter; tapping a chip clears that
 * filter. Rendered as an outline tag with a close glyph (distinct from the
 * filled "selected" pick chips inside the filter sheet).
 */
export function ActiveFilterChips({ filters, accounts, categories, onClear }: ActiveFilterChipsProps) {
  const { t } = useTranslation()
  const items = collectActiveFilters(filters, accounts, categories, t)

  if (items.length === 0) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      accessibilityRole="adjustable"
    >
      {items.map((item) => (
        <Chip
          key={item.key}
          onPress={() => onClear(item.key)}
          leading={<CloseGlyph />}
          accessibilityLabel={`${item.label}, ${t('transactions.clearFilter')}`}
          style={styles.chip}
        >
          {item.label}
        </Chip>
      ))}
    </ScrollView>
  )
}

function CloseGlyph() {
  const tokens = useTokens()
  return <Ionicons name="close" size={14} color={tokens.mutedForeground} />
}

function collectActiveFilters(
  filters: TransactionFilters,
  accounts: AccountWithBalance[] | undefined,
  categories: Category[] | undefined,
  t: (key: string) => string,
): ActiveFilter[] {
  const items: ActiveFilter[] = []

  if (filters.type) {
    items.push({ key: 'type', label: t(`transactions.types.${filters.type}`) })
  }
  if (filters.accountId) {
    const account = accounts?.find((next) => next.id === filters.accountId)
    if (account) {
      items.push({ key: 'accountId', label: account.name })
    }
  }
  if (filters.categoryId) {
    const category = categories?.find((next) => next.id === filters.categoryId)
    if (category) {
      items.push({ key: 'categoryId', label: `${category.icon} ${category.name}`.trim() })
    }
  }
  if (filters.dateRange !== 'all') {
    items.push({ key: 'dateRange', label: t(DATE_RANGE_LABEL_KEY[filters.dateRange]) })
  }

  return items
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  // Bump the base 36pt chip to the 44pt touch-target floor.
  chip: {
    minHeight: 44,
  },
})
