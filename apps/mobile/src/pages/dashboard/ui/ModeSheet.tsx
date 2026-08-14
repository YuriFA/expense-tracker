import { Pressable, View } from 'react-native'
import { BottomSheetView } from '@gorhom/bottom-sheet'
import { BottomSheet, Icon, Row, Stack, Text } from '@/shared/ui'

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
  visible: boolean
  activeMode: SummaryMode
  onSelect: (mode: SummaryMode) => void
  onClose: () => void
}

/** Summary mode switcher: Расходы / Баланс за месяц / Баланс общий. */
export function ModeSheet(props: ModeSheetProps) {
  const { visible, activeMode, onSelect, onClose } = props

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="home-mode-sheet">
      <BottomSheetView testID="home-mode-sheet">
        <Stack gap="md" className="px-4 pb-8 pt-2">
          <Text variant="h3" className="mb-2">
            Отображение суммы
          </Text>
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
                <Row align="center" gap="md">
                  <Stack gap="xs" className="flex-1">
                    <Text variant="body" className="font-medium text-foreground">
                      {option.label}
                    </Text>
                    <Text variant="caption" className="text-muted-foreground">
                      {option.hint}
                    </Text>
                  </Stack>
                  {active ? (
                    <View>
                      <Icon name="checkmark" size={20} color="#7C5CFF" />
                    </View>
                  ) : null}
                </Row>
              </Pressable>
            )
          })}
        </Stack>
      </BottomSheetView>
    </BottomSheet>
  )
}
