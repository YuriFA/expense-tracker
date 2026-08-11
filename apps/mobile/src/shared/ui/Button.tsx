import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { type PropsWithChildren } from 'react'
import { useTokens } from './theme'
import { Text } from './Text'
import { haptics } from '@shared/lib/haptics'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'destructive'
export type ButtonSize = 'md' | 'lg'

interface ButtonProps extends PropsWithChildren {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to full width (the save button lives in the thumb zone). */
  full?: boolean
  disabled?: boolean
  loading?: boolean
  /** Explicit VoiceOver/TalkBack label; falls back to the text children. */
  accessibilityLabel?: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { md: 44, lg: 52 }

/**
 * The canonical button. One component, four variants across the whole product:
 * `primary` (ink fill), `ghost` (chromeless nav), `outline` (secondary), and
 * `destructive` (delete / error only). Touch targets are >= 44pt (large = 52).
 * A light haptic fires on press, honoring the OS disable setting.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  full = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  onPress,
  style,
  children,
}: ButtonProps) {
  const tokens = useTokens()
  const height = SIZE_HEIGHT[size]

  const { background, textTone, border } = resolveVariant(variant, tokens)
  const isFilled = variant === 'primary' || variant === 'destructive'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled || loading}
      onPress={() => {
        haptics.impact('light')
        onPress?.()
      }}
      style={({ pressed }) => [
        styles.base,
        { height, backgroundColor: background, borderColor: border, opacity: disabled ? 0.4 : 1 },
        full && { alignSelf: 'stretch' },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? tokens.inkForeground : tokens.foreground} />
      ) : (
        <Text
          weight={isFilled ? 600 : 500}
          size={size === 'lg' ? 'body' : 'label'}
          tone={textTone}
        >
          {children}
        </Text>
      )}
    </Pressable>
  )
}

function resolveVariant(
  variant: ButtonVariant,
  tokens: ReturnType<typeof useTokens>,
): { background: string; textTone: 'default' | 'inverse'; border: string } {
  switch (variant) {
    case 'primary':
      return { background: tokens.ink, textTone: 'inverse', border: 'transparent' }
    case 'ghost':
      return { background: 'transparent', textTone: 'default', border: 'transparent' }
    case 'outline':
      return { background: 'transparent', textTone: 'default', border: tokens.border }
    case 'destructive':
      return { background: tokens.destructive, textTone: 'inverse', border: 'transparent' }
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
})
