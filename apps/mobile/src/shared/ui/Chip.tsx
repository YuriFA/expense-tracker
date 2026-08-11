import { Pressable, View, type ViewStyle } from 'react-native'
import { type PropsWithChildren } from 'react'
import { cva } from 'class-variance-authority'
import { useTokens } from './theme'
import { Text } from './Text'
import { cn } from '@shared/lib/cn'

interface ChipProps extends PropsWithChildren {
  selected?: boolean
  onPress?: () => void
  /** Icon node rendered before the label (category glyph, etc.). */
  leading?: React.ReactNode
  /** VoiceOver/TalkBack label; defaults to the label text when omitted. */
  accessibilityLabel?: string
  style?: ViewStyle
  /** Extra classes composed onto the chip (react-native-reusables idiom). */
  className?: string
}

/**
 * Structural chip classes (theme-independent layout): a pill row at the 36pt
 * floor. Colors stay token-driven below so the synchronous theme invariant +
 * pixel parity hold; `className` composes last.
 */
const chipClasses = cva(
  'min-h-[36px] flex-row items-center gap-1.5 rounded-full px-3.5 border-hairline',
)

/**
 * Chip - account pick, active filters. Selectable; the selected state takes the
 * ink fill + inverse label, unselected is bordered. Touch target >= 44pt.
 */
export function Chip({
  selected = false,
  onPress,
  leading,
  accessibilityLabel,
  style,
  className,
  children,
}: ChipProps) {
  const tokens = useTokens()

  const fillStyle = {
    backgroundColor: selected ? tokens.ink : 'transparent',
    borderColor: selected ? 'transparent' : tokens.border,
  }

  const label = (
    <Text size="label" weight={500} tone={selected ? 'inverse' : 'default'}>
      {children}
    </Text>
  )

  if (!onPress) {
    return (
      <View
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={cn(chipClasses(), className)}
        style={[fillStyle, style]}
      >
        {leading}
        {label}
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={cn(chipClasses(), className)}
      style={({ pressed }) => [fillStyle, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      {leading}
      {label}
    </Pressable>
  )
}
