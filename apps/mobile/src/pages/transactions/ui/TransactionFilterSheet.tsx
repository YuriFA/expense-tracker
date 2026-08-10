import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BottomSheet, Button, Chip, Text, useTokens } from '@shared/ui'
import { mapCategories } from '@expense-tracker/i18n'
import type {
  AccountWithBalance,
  Category,
  TransactionType,
} from '@expense-tracker/api'
import type { TransactionFilters } from '../model/use-transaction-filters'
import type { DateRangePreset } from '../lib/date-range'

interface TransactionFilterSheetProps {
  visible: boolean
  onClose: () => void
  filters: TransactionFilters
  accounts: AccountWithBalance[] | undefined
  categories: Category[] | undefined
  onTypeChange: (type: TransactionType | undefined) => void
  onAccountChange: (accountId: string | undefined) => void
  onCategoryChange: (categoryId: string | undefined) => void
  onDateRangeChange: (range: DateRangePreset) => void
  onReset: () => void
}

const TYPE_OPTIONS: readonly TransactionType[] = ['expense', 'income', 'transfer']
const DATE_OPTIONS: readonly DateRangePreset[] = ['all', 'today', 'last30', 'thisMonth']

const DATE_LABEL_KEY: Record<DateRangePreset, string> = {
  all: 'transactions.dateFilter.allTime',
  today: 'transactions.dateFilter.today',
  last30: 'transactions.dateFilter.last30Days',
  thisMonth: 'transactions.dateFilter.thisMonth',
}

/**
 * The Filter bottom sheet (design section 7): type, account, category, and
 * date-range selectors. Each selector is a single-select chip row with an
 * explicit "All" option; filters apply live as the user toggles them, so the
 * footer's Reset clears everything and Done dismisses to reveal the result.
 *
 * Category is hidden when the type filter is "transfer" (transfers have no
 * category) and the category list narrows to the selected type otherwise, so a
 * pick can never produce an impossible type+category combination.
 */
export function TransactionFilterSheet({
  visible,
  onClose,
  filters,
  accounts,
  categories,
  onTypeChange,
  onAccountChange,
  onCategoryChange,
  onDateRangeChange,
  onReset,
}: TransactionFilterSheetProps) {
  const { t } = useTranslation()
  const tokens = useTokens()

  // Localized categories narrowed to the active type (or all when no type).
  const visibleCategories = categories
    ? filters.type && filters.type !== 'transfer'
      ? mapCategories(categories, (key) => t(key)).filter((c) => c.type === filters.type)
      : mapCategories(categories, (key) => t(key))
    : []
  const showCategory = filters.type !== 'transfer'

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('transactions.filtersTitle')} heightRatio={0.75}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Section label={t('transactions.filters.typeLabel')}>
          <ChipRow>
            <FilterChip
              label={t('transactions.filters.allTypes')}
              selected={filters.type === undefined}
              onSelect={() => onTypeChange(undefined)}
              accessibilityLabel={t('transactions.filters.allTypes')}
            />
            {TYPE_OPTIONS.map((type) => (
              <FilterChip
                key={type}
                label={t(`transactions.types.${type}`)}
                selected={filters.type === type}
                onSelect={() => onTypeChange(type)}
                accessibilityLabel={t(`transactions.types.${type}`)}
              />
            ))}
          </ChipRow>
        </Section>

        <Section label={t('transactions.filters.accountLabel')}>
          <ChipRow>
            <FilterChip
              label={t('transactions.filters.allAccounts')}
              selected={filters.accountId === undefined}
              onSelect={() => onAccountChange(undefined)}
              accessibilityLabel={t('transactions.filters.allAccounts')}
            />
            {(accounts ?? []).map((account) => (
              <FilterChip
                key={account.id}
                label={account.name}
                selected={filters.accountId === account.id}
                onSelect={() => onAccountChange(account.id)}
                accessibilityLabel={account.name}
              />
            ))}
          </ChipRow>
        </Section>

        {showCategory ? (
          <Section label={t('transactions.filters.categoryLabel')}>
            <ChipRow>
              <FilterChip
                label={t('transactions.filters.allCategories')}
                selected={filters.categoryId === undefined}
                onSelect={() => onCategoryChange(undefined)}
                accessibilityLabel={t('transactions.filters.allCategories')}
              />
              {visibleCategories.map((category) => (
                <FilterChip
                  key={category.id}
                  label={`${category.icon} ${category.name}`.trim()}
                  selected={filters.categoryId === category.id}
                  onSelect={() => onCategoryChange(category.id)}
                  accessibilityLabel={category.name}
                />
              ))}
            </ChipRow>
          </Section>
        ) : null}

        <Section label={t('transactions.filters.dateRangeLabel')} style={styles.lastSection}>
          <ChipRow>
            {DATE_OPTIONS.map((range) => (
              <FilterChip
                key={range}
                label={t(DATE_LABEL_KEY[range])}
                selected={filters.dateRange === range}
                onSelect={() => onDateRangeChange(range)}
                accessibilityLabel={t(DATE_LABEL_KEY[range])}
              />
            ))}
          </ChipRow>
        </Section>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: tokens.border }]}>
        <Button variant="ghost" onPress={onReset} style={styles.flex}>
          {t('transactions.reset')}
        </Button>
        <Button variant="outline" onPress={onClose} style={styles.flex}>
          {t('common.close')}
        </Button>
      </View>
    </BottomSheet>
  )
}

/** A labeled filter section. */
function Section({
  label,
  style,
  children,
}: {
  label: string
  style?: ViewStyle
  children: React.ReactNode
}) {
  return (
    <View style={style}>
      <Text size="label" tone="muted" style={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </View>
  )
}

/** Horizontal, scrollable container for a single-select chip row. */
function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {children}
    </ScrollView>
  )
}

interface FilterChipProps {
  label: string
  selected: boolean
  onSelect: () => void
  accessibilityLabel: string
}

/** A selectable filter pill bumped to the 44pt touch-target floor. */
function FilterChip({ label, selected, onSelect, accessibilityLabel }: FilterChipProps) {
  return (
    <Chip
      selected={selected}
      onPress={onSelect}
      accessibilityLabel={accessibilityLabel}
      style={styles.chip}
    >
      {label}
    </Chip>
  )
}

const styles = StyleSheet.create({
  body: {
    gap: 20,
    paddingBottom: 8,
  },
  sectionLabel: {
    marginBottom: 8,
  },
  lastSection: {
    marginBottom: 4,
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 4,
  },
  // The base Chip is a 36pt pill; bump to the 44pt touch-target floor here.
  chip: {
    minHeight: 44,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: {
    flex: 1,
  },
})
