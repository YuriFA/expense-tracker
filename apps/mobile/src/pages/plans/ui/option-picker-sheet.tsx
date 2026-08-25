// Single-choice option sheet (the AccountPickerSheet row idiom, kept
// page-local): titled rows with an optional caption, a checkmark on the
// selected value, and select-dismisses-sheet behavior. Backs the plans
// form's regularity / confirmation-mode / reminder rows (design D7).

import { View } from 'react-native'
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  BottomSheetScrollView,
} from '@/shared/ui/bottom-sheet'
import { Icon } from '@/shared/ui/icon'
import { Pressable } from '@/shared/ui/pressable'
import { Text } from '@/shared/ui/text'

export interface OptionItem<T extends string> {
  value: T
  label: string
  /** Optional one-line description rendered under the label. */
  caption?: string
}

export function OptionPickerSheet<T extends string>({
  ref,
  title,
  options,
  selected,
  onSelect,
  testIDPrefix,
}: {
  ref: React.Ref<BottomSheetRef>
  title: string
  options: ReadonlyArray<OptionItem<T>>
  selected: T
  onSelect: (value: T) => void
  /** e.g. `plans-form-reminder` → `plans-form-reminder-option-on_day`. */
  testIDPrefix: string
}) {
  const handleSelect = (value: T) => {
    onSelect(value)
    if (ref && typeof ref !== 'function') ref.current?.dismiss()
  }

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['40%']}
      testID={`${testIDPrefix}-picker`}
      // 'push' stacks this sheet fully on top of the form sheet; the default
      // 'switch' would minimize the form, unmounting its content — and this
      // picker's rows render inside that content (the AccountPickerSheet
      // reason).
      stackBehavior="push"
    >
      <BottomSheetHeader title={title} />
      <BottomSheetScrollView testID={`${testIDPrefix}-picker-list`}>
        <View className="gap-1 px-4 pb-safe">
          {options.map((option) => {
            const active = option.value === selected
            return (
              <Pressable
                key={option.value}
                testID={`${testIDPrefix}-option-${option.value}`}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                className="flex-row items-center gap-3 py-3"
                onPress={() => handleSelect(option.value)}
              >
                <View className="flex-1 gap-0.5">
                  <Text variant="body" className="text-foreground" numberOfLines={1}>
                    {option.label}
                  </Text>
                  {option.caption ? (
                    <Text variant="caption" className="text-muted-foreground">
                      {option.caption}
                    </Text>
                  ) : null}
                </View>
                {active ? (
                  <Icon name="checkmark" size={20} colorClassName="accent-primary" />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  )
}
