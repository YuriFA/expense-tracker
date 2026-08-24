import { View } from 'react-native'
import type { Debtor } from '@expense-tracker/api'
import { Icon } from '@/shared/ui/icon'
import { Text } from '@/shared/ui/text'
import { Pressable } from '@/shared/ui/pressable'
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  BottomSheetScrollView,
} from '@/shared/ui/bottom-sheet'

/**
 * Full debtor list presented as a sheet stacked above the operation sheet
 * (the category-picker-sheet pattern): selecting reports the id up and
 * dismisses only this sheet.
 */
export function DebtorPickerSheet({
  ref,
  debtors,
  selectedId,
  onSelect,
}: {
  ref: React.Ref<BottomSheetRef>
  debtors: Debtor[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const handleSelect = (id: string) => {
    onSelect(id)
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet ref={ref} snapPoints={['70%']} testID="debts-debtor-picker" stackBehavior="push">
      <BottomSheetHeader title="Должник" />
      <BottomSheetScrollView testID="debts-debtor-picker-list">
        <View className="gap-1 px-4 pb-4">
          {debtors.length === 0 ? (
            // TODO(i18n): RU wording until mobile i18n wiring lands.
            <Text variant="body-sm" className="text-muted-foreground">
              Нет должников - добавьте человека на экране долгов
            </Text>
          ) : (
            debtors.map((debtor) => {
              const selected = debtor.id === selectedId
              return (
                <Pressable
                  key={debtor.id}
                  testID={`debts-debtor-option-${debtor.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={debtor.name}
                  accessibilityState={{ selected }}
                  className="flex-row items-center gap-3 py-3"
                  onPress={() => handleSelect(debtor.id)}
                >
                  <Text variant="body" className="flex-1 text-foreground" numberOfLines={1}>
                    {debtor.name}
                  </Text>
                  {selected ? (
                    <Icon name="checkmark" size={20} colorClassName="accent-primary" />
                  ) : null}
                </Pressable>
              )
            })
          )}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}
