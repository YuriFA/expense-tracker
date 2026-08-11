import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { type PropsWithChildren } from 'react'
import { cva } from 'class-variance-authority'
import { useTokens } from './theme'
import { Text } from './Text'
import { cn } from '@shared/lib/cn'
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
  /** Extra classes composed onto the root (react-native-reusables idiom). */
  className?: string
}

/**
 * Structural (theme-independent) button classes - the react-native-reusables
 * pattern: a `cva` table for the shared layout/sizing. Colors stay token-driven
 * (see resolveVariant) so the synchronous theme invariant + pixel parity hold;
 * nativewind utilities own the layout here. `className` composes last so callers
 * can override.
 */
const buttonClasses = cva('shrink-0 flex-row items-center justify-center rounded-xl px-4', {
  variants: {
    size: {
      md: 'h-[44px]',
      lg: 'h-[52px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

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
  className,
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
      className={cn(buttonClasses({ size }), full && 'self-stretch', className)}
      style={({ pressed }) => [
        {
          height,
          backgroundColor: background,
          borderColor: border,
          opacity: disabled ? 0.4 : 1,
        },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isFilled ? tokens.inkForeground : tokens.foreground} />
      ) : (
        <Text weight={isFilled ? 600 : 500} size={size === 'lg' ? 'body' : 'label'} tone={textTone}>
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
