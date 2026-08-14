import { Pressable, View } from 'react-native'
import { Icon, IconButton, Text } from '@/shared/ui'

export interface SummaryCardProps {
  /** Current mode title, e.g. "Расходы". */
  title: string
  amountText: string
  periodLabel: string
  /** Next-month navigation is unavailable at the current month. */
  canGoNext: boolean
  onOpenModes: () => void
  onPrevPeriod: () => void
  onNextPeriod: () => void
}

export function SummaryCard(props: SummaryCardProps) {
  const { title, amountText, periodLabel, canGoNext, onOpenModes, onPrevPeriod, onNextPeriod } =
    props

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          testID="home-summary-mode"
          accessibilityRole="button"
          accessibilityLabel="Изменить отображение суммы"
          className="flex-row items-center gap-1 active:opacity-70"
          onPress={onOpenModes}
        >
          <Text variant="h3">{title}</Text>
          <Icon name="chevron-down" size={18} color="#737373" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between">
        <Text variant="display" className="text-foreground">
          {amountText}
        </Text>
        <View className="flex-row items-center gap-1">
          <IconButton
            icon="chevron-back"
            size="sm"
            accessibilityLabel="Предыдущий месяц"
            onPress={onPrevPeriod}
            testID="home-period-prev"
          />
          <Text variant="caption">{periodLabel}</Text>
          <IconButton
            icon="chevron-forward"
            size="sm"
            accessibilityLabel="Следующий месяц"
            disabled={!canGoNext}
            onPress={onNextPeriod}
            testID="home-period-next"
          />
        </View>
      </View>
    </View>
  )
}
