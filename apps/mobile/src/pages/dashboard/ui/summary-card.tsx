import { Pressable, View } from 'react-native'
import { Icon, IconButton, Text } from '@/shared/ui'
import { useRef } from 'react'
import { BottomSheetRef } from '@/shared/ui/bottom-sheet'
import { ModeSheet, type SummaryMode } from './mode-sheet'

export interface SummaryCardProps {
  mode: SummaryMode
  /** Current mode title, e.g. "Расходы". */
  title: string
  amountText: string
  periodLabel: string
  /** Next-month navigation is unavailable at the current month. */
  canGoNext: boolean
  onModeChange: (mode: SummaryMode) => void
  onPrevPeriod: () => void
  onNextPeriod: () => void
}

export function SummaryCard({
  mode,
  title,
  amountText,
  periodLabel,
  canGoNext,
  onModeChange,
  onPrevPeriod,
  onNextPeriod,
}: SummaryCardProps) {
  const modeSheetRef = useRef<BottomSheetRef>(null)

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

      <ModeSheet
        ref={modeSheetRef}
        activeMode={mode}
        onSelect={(nextMode) => {
          onModeChange(nextMode)
          modeSheetRef.current?.dismiss()
        }}
      />
    </>
  )
}
