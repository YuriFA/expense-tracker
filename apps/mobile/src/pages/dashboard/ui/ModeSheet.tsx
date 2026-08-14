import { Pressable, View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { BottomSheet, Icon, Text } from '@/shared/ui'
import { BottomSheetBody, BottomSheetHeader, BottomSheetRef } from '@/shared/ui/bottom-sheet'

export type SummaryMode = 'expenses' | 'monthly-balance' | 'total-balance'

interface ModeOption {
  id: SummaryMode
  label: string
  hint: string
}

// TODO(i18n): RU strings are hardcoded until react-i18next is wired.
const OPTIONS: ReadonlyArray<ModeOption> = [
  { id: 'expenses', label: 'Расходы', hint: 'за выбранный месяц' },
  { id: 'monthly-balance', label: 'Баланс за месяц', hint: 'доходы − расходы' },
  { id: 'total-balance', label: 'Баланс общий', hint: 'по всем счетам' },
]

export interface ModeSheetProps {
  ref: React.Ref<BottomSheetRef>
  activeMode: SummaryMode
  onSelect: (mode: SummaryMode) => void
}

/** Summary mode switcher: Расходы / Баланс за месяц / Баланс общий. */
export function ModeSheet({ ref, activeMode, onSelect }: ModeSheetProps) {
  return (
    <BottomSheet ref={ref} testID="home-mode-sheet">
      <BottomSheetView testID="home-mode-sheet">
        <BottomSheetHeader title="Отображение суммы" />

        <BottomSheetBody className="gap-4">
          {OPTIONS.map((option) => {
            const active = option.id === activeMode
            return (
              <Pressable
                key={option.id}
                testID={`home-mode-option-${option.id}${active ? '-active' : ''}`}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                className="active:opacity-70"
                onPress={() => onSelect(option.id)}
              >
                <View className="flex-row items-center gap-4">
                  <View className="flex-1 gap-1">
                    <Text variant="body" className="font-medium text-foreground">
                      {option.label}
                    </Text>
                    <Text variant="caption" className="text-muted-foreground">
                      {option.hint}
                    </Text>
                  </View>
                  {active ? (
                    <View>
                      <Icon name="checkmark" size={20} color="#7C5CFF" />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )
          })}
        </BottomSheetBody>
      </BottomSheetView>
    </BottomSheet>
  )
}
