import { Pressable, View } from 'react-native'
import { Icon, IconButton, Text } from '@/shared/ui'
import { useRef, useState } from 'react'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { ModeSheet, type SummaryMode } from './mode-sheet'
import { formatAmount, monthRangeLabel } from '../model/format'
import { MonthCursor, monthlyBalance, totalBalance, totalExpenses } from '../model/selectors'
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from '../model/mock-data'

export interface SummaryCardProps {
  cursor: MonthCursor
  onPrevPeriod: () => void
  onNextPeriod: () => void
}

export function SummaryCard({ cursor, onPrevPeriod, onNextPeriod }: SummaryCardProps) {
  const modeSheetRef = useRef<BottomSheetRef>(null)
  const [mode, setMode] = useState<SummaryMode>('expenses')

  // TODO(i18n): RU strings are hardcoded until react-i18next is wired.
  const MODE_TITLES: Record<SummaryMode, string> = {
    expenses: 'Расходы',
    'monthly-balance': 'Баланс за месяц',
    'total-balance': 'Баланс общий',
  }
  const title = MODE_TITLES[mode]

  const periodLabel = monthRangeLabel(cursor.year, cursor.month)
  const amountText =
    mode === 'expenses'
      ? formatAmount(totalExpenses(MOCK_TRANSACTIONS, cursor))
      : mode === 'monthly-balance'
        ? formatAmount(monthlyBalance(MOCK_TRANSACTIONS, cursor))
        : formatAmount(totalBalance(MOCK_ACCOUNTS, MOCK_TRANSACTIONS))

  return (
    <>
      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            testID="home-summary-mode"
            accessibilityRole="button"
            accessibilityLabel="Изменить отображение суммы"
            className="flex-row items-center gap-1 active:opacity-70"
            onPress={() => modeSheetRef.current?.present()}
          >
            <Text variant="display">{title}</Text>
            <Icon name="chevron-down" size={24} color="#737373" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between">
          <Text variant="h1" className="text-foreground">
            {amountText}
          </Text>
          <View className="flex-row items-center gap-1">
            <IconButton
              testID="home-period-prev"
              icon="chevron-back"
              size="sm"
              accessibilityLabel="Предыдущий месяц"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onPrevPeriod}
            />
            <Text variant="caption">{periodLabel}</Text>
            <IconButton
              testID="home-period-next"
              icon="chevron-forward"
              size="sm"
              accessibilityLabel="Следующий месяц"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onNextPeriod}
            />
          </View>
        </View>
      </View>

      <ModeSheet
        ref={modeSheetRef}
        activeMode={mode}
        onSelect={(nextMode) => {
          setMode(nextMode)
          modeSheetRef.current?.dismiss()
        }}
      />
    </>
  )
}
