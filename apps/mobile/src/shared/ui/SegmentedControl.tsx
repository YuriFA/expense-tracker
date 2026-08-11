import { Pressable, View } from 'react-native'
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

/** Segment layout + the selected "lift" shadow; the surface fill is token-driven. */
const segmentClasses = cva(
  'flex-1 min-h-[44px] rounded-[10px] items-center justify-center',
  {
    variants: {
      selected: {
        true: 'shadow-sm shadow-black/5 elevation-1',
        false: '',
      },
    },
    defaultVariants: { selected: false },
  },
)

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
            className={cn(segmentClasses({ selected }))}
            style={selected ? { backgroundColor: tokens.surface } : undefined}
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
