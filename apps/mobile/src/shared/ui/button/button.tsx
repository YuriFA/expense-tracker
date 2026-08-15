import { Pressable } from '../pressable'
import { Text } from '../text'
import type { PressableProps } from '../pressable'
import { ActivityIndicator } from 'react-native'

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

const sizeStyles: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-3 py-1.5 rounded-md', text: 'text-sm' },
  md: { container: 'px-4 py-2 rounded-lg', text: 'text-base' },
  lg: { container: 'px-6 py-3 rounded-lg', text: 'text-lg' },
}

const disabledOpacity = 0.5

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  text,
  disabled,
  style,
  className,
  ...pressableProps
}: ButtonProps) {
  const variantClassName = variantStyles[variant]
  const textVariantClassName = textVariantStyles[variant]
  const { container: sizeContainer, text: sizeText } = sizeStyles[size]
  const isDisabled = disabled || loading

  return (
    <Pressable
      className={`${variantClassName} ${sizeContainer} ${className || ''}`.trim()}
      style={(state) => {
        const baseStyle: any = {}
        if (isDisabled) baseStyle.opacity = disabledOpacity
        else if (state.pressed) baseStyle.opacity = 0.8
        if (style) {
          if (typeof style === 'function') return [baseStyle, style(state)]
          return [baseStyle, style]
        }
        return baseStyle
      }}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled ?? false }}
      {...pressableProps}
    >
      {loading ? (
        <ActivityIndicator color={textVariantClassName} />
      ) : text ? (
        <Text variant="button" className={`${textVariantClassName} ${sizeText}`.trim()}>
          {text}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
