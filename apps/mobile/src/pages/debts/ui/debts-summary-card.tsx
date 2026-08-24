import { View } from 'react-native'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { formatAmount } from '@/shared/lib/format/format'
import { DEBT_DIRECTION_VIEWS } from '../model/kind'
import type { DirectionBalances } from '../model/selectors'
import { Card } from '@/shared/ui/card'

/**
 * Dual-total summary card: both direction totals as separate rows («Мне
 * должны» / «Я должен»). Unlike the cashflow SummaryCard there is no period
 * navigation - debts are not month-scoped.
 */
export function DebtsSummaryCard({ totals }: { totals: DirectionBalances }) {
  return (
    <Card variant="elevated" className="bg-brand-indigo/20" testID="debts-summary">
      <SummaryRow
        testID="debts-total-receivable"
        label={DEBT_DIRECTION_VIEWS.receivable.summaryLabel}
        icon="arrow-down"
        total={totals.receivable}
      />
      <SummaryRow
        testID="debts-total-payable"
        label={DEBT_DIRECTION_VIEWS.payable.summaryLabel}
        icon="arrow-up"
        total={totals.payable}
      />
    </Card>
  )
}

function SummaryRow({
  testID,
  label,
  icon,
  total,
}: {
  testID: string
  label: string
  icon: 'arrow-down' | 'arrow-up'
  total: number
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={16} colorClassName="accent-muted-foreground" />
        <Text variant="body-sm" className="text-muted-foreground">
          {label}
        </Text>
      </View>
      {/* The testID sits on the amount itself so flows assert the figure. */}
      <Text variant="h3" className="text-foreground" testID={testID}>
        {formatAmount(total)}
      </Text>
    </View>
  )
}
