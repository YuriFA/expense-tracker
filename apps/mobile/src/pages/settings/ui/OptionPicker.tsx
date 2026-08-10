import { Pressable, View, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheet, Text, useTokens } from '@shared/ui'
import { haptics } from '@shared/lib/haptics'
import type { OptionEntry } from '../model/options'

interface OptionPickerProps<T extends string> {
  visible: boolean
  onClose: () => void
  title: string
  options: ReadonlyArray<OptionEntry<T>>
  selectedValue: T
  onSelect: (value: T) => void
}

/**
 * The canonical selector for settings that have more than two/three values or
 * need a secondary line (currency names): a bottom-sheet radio list. Reused by
 * the language and currency rows. Selecting an option fires a light haptic,
 * commits the change, and dismisses the sheet in one tap.
 *
 * Generic over the underlying string-union value so the parent stays type-safe
 * (the store setters are called with the exact `AppLocale` / `CurrencyCode`).
 */
export function OptionPicker<T extends string>({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: OptionPickerProps<T>) {
  const tokens = useTokens()

  const handleSelect = (value: T) => {
    if (value !== selectedValue) {
      haptics.impact('light')
      onSelect(value)
    }
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} heightRatio={0.42}>
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }} showsVerticalScrollIndicator={false}>
        {options.map((option, index) => {
          const selected = option.value === selectedValue
          const isLast = index === options.length - 1
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => handleSelect(option.value)}
              style={({ pressed }) => (pressed ? { opacity: 0.55 } : null)}
            >
              <View
                style={[
                  styles.option,
                  !isLast && {
                    borderBottomColor: tokens.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={styles.optionText}>
                  <Text size="body">{option.label}</Text>
                  {option.description ? (
                    <Text size="label" tone="muted">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={tokens.ink} />
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </ScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  option: {
    minHeight: 52,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
})
