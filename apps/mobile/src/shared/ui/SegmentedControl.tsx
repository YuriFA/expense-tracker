import { Pressable, View, type ViewStyle } from 'react-native'
import { cva } from 'class-variance-authority'
import { useTokens } from './theme'
import { Text } from './Text'
import { cn } from '@shared/lib/cn'
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
  /** Extra classes composed onto the track (react-native-reusables idiom). */
  className?: string
}

/** Track layout (theme-independent); the muted fill is applied from tokens. */
const trackClasses = cva('flex-row rounded-xl p-[3px]')

/**
 * Segment layout. This className MUST stay stable across renders / segments -
 * the selected "lift" is applied via the inline `style` below, not via NativeWind
 * classes. NativeWind implements `shadow-*`/`elevation-*` with CSS custom
 * properties (`--tw-shadow-color`, `-rn-shadow-*`), which it can only apply by
 * wrapping the component in a variable-context provider, decided at render
 * time. Conditionally adding those classes (only on the selected segment) forces
 * NativeWind to remount the segment whenever the selection changes - a remount
 * inside a re-render tears down the React tree and surfaces as a misleading
 * "Couldn't find a navigation context" crash.
 */
const segmentClasses = 'flex-1 min-h-[44px] rounded-[10px] items-center justify-center'

/** Equivalent to `shadow-sm shadow-black/5 elevation-1`, but as a plain RN style. */
const selectedShadow: ViewStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
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
  className,
}: SegmentedControlProps<T>) {
  const tokens = useTokens()

  return (
    <View
      role="radiogroup"
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn(trackClasses(), className)}
      style={{ backgroundColor: tokens.muted }}
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
            className={cn(segmentClasses)}
            style={selected ? { backgroundColor: tokens.surface, ...selectedShadow } : undefined}
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
