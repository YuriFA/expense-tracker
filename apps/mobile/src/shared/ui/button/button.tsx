import { Pressable } from '../pressable'
import { Text } from '../text'
import type { PressableProps } from '../pressable'
import { ActivityIndicator } from 'react-native'
import { cn } from '@/shared/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  children?: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  text?: string
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'bg-transparent border border-border',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
}

const textVariantStyles: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
}

// ActivityIndicator's `color` is a non-style prop: it needs the accent- form
// of the same token classes via `colorClassName`.
const indicatorVariantStyles: Record<ButtonVariant, string> = {
  primary: 'accent-primary-foreground',
  secondary: 'accent-secondary-foreground',
  outline: 'accent-foreground',
  ghost: 'accent-foreground',
  destructive: 'accent-destructive-foreground',
}

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-3 py-1.5 rounded-input', text: 'text-sm' },
  md: { container: 'px-4 py-3 rounded-input', text: 'text-base' },
  lg: { container: 'px-6 py-3 rounded-input', text: 'text-lg' },
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  text,
  disabled,
  className,
  ...pressableProps
}: ButtonProps) {
  const variantClassName = variantStyles[variant]
  const indicatorVariantClassName = indicatorVariantStyles[variant]
  const { container: sizeContainer, text: sizeText } = sizeStyles[size]
  const isDisabled = disabled || loading

  return (
    <Pressable
      className={cn(
        variantClassName,
        sizeContainer,
        'disabled:opacity-50 active:opacity-80 active:scale-95 transition-transform',
        className,
      )}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled ?? false }}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator colorClassName={indicatorVariantClassName} />
      ) : text ? (
        <Text variant="button" className={cn('text-center', textVariantStyles[variant], sizeText)}>
          {text}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
