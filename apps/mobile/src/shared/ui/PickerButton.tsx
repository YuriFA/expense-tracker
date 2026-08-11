import { View, Pressable, type ViewStyle } from 'react-native'
import { type PropsWithChildren, type ReactNode } from 'react'
import { cva } from 'class-variance-authority'
import { Ionicons } from '@expo/vector-icons'
import { useTokens } from './theme'
import { Text } from './Text'
import { cn } from '@shared/lib/cn'

interface PickerButtonProps {
  /** Field label shown above the value when `label` is set (e.g. "Account"). */
  label?: string
  /** The selected value text (e.g. the account name). */
  value?: string | null
  /** Leading node - usually an emoji/icon glyph for the selection. */
  leading?: ReactNode
  /** Placeholder shown when there is no `value` (muted). */
  placeholder?: string
  onPress: () => void
  /** VoiceOver/TalkBack label; defaults to `label ?? value`. */
  accessibilityLabel?: string
  disabled?: boolean
  /** Extra classes composed onto the root (react-native-reusables idiom). */
  className?: string
  style?: ViewStyle
}

/**
 * Structural classes (theme-independent): a full-width tappable field row that
 * grows equally when placed side by side. Colors stay token-driven below so the
 * synchronous theme invariant + pixel parity hold; `className` composes last.
 */
const buttonClasses = cva(
  'flex-1 min-h-[52px] flex-row items-center gap-2.5 rounded-xl px-3.5 border-hairline',
)

/**
 * A tappable "field" button that opens a picker (the category / account
 * selectors on Home). Shows an optional leading glyph, the selected value (or a
 * muted placeholder), and a trailing chevron - the standard iOS list-field look.
 * The selected value reads at body weight; the whole row is a >= 52pt touch
 * target. Token-driven colors so dark mode parity holds.
 */
export function PickerButton({
  label,
  value,
  leading,
  placeholder,
  onPress,
  accessibilityLabel,
  disabled = false,
  className,
  style,
}: PropsWithChildren<PickerButtonProps>) {
  const tokens = useTokens()
  const hasValue = Boolean(value)
  const resolvedLabel = accessibilityLabel ?? label ?? value ?? placeholder

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(buttonClasses(), className)}
      style={({ pressed }) => [
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="flex-1">
        {label ? (
          <Text size="caption" tone="muted">
            {label}
          </Text>
        ) : null}
        <Text size="label" weight={500} tone={hasValue ? 'default' : 'muted'} numberOfLines={1}>
          {hasValue ? value : placeholder}
        </Text>
      </View>
      <Ionicons name="chevron-down" size={16} color={tokens.mutedForeground} />
    </Pressable>
  )
}
