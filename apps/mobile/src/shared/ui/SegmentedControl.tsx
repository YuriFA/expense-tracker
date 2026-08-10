import { Pressable, View, StyleSheet } from 'react-native'
import { useTokens } from './theme'
import { Text } from './Text'
import { haptics } from '@shared/lib/haptics'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  /** A11y label for the whole control, e.g. "Transaction type". */
  accessibilityLabel?: string
}

/**
 * Segmented control - the canonical type switch (Expense / Income / Transfer).
 * One row, mutually exclusive segments; the active segment takes the ink fill
 * with a light haptic on change. Announces the new selection to assistive tech.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const tokens = useTokens()

  return (
    <View
      role="radiogroup"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: tokens.muted, borderRadius: 12 },
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            role="radio"
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (!selected) {
                haptics.impact('light')
                onChange(option.value)
              }
            }}
            style={[
              styles.segment,
              selected && { backgroundColor: tokens.surface },
              selected && styles.segmentSelected,
            ]}
          >
            <Text weight={selected ? 600 : 500} tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    // Hairline "lift" via subtle shadow only on the active segment (allowed:
    // depth in navigation/material, not decoration).
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
})
