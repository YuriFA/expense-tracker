import { Text as RNText, type TextProps as RNTextProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label'
  | 'button'

export interface TextProps extends Omit<RNTextProps, 'className'> {
  className?: string
  variant?: TextVariant
}

const variantStyles: Record<TextVariant, string> = {
  display: 'text-5xl font-bold text-foreground',
  h1: 'text-4xl font-bold text-foreground',
  h2: 'text-3xl font-semibold text-foreground',
  h3: 'text-2xl font-semibold text-foreground',
  h4: 'text-xl font-semibold text-foreground',
  body: 'text-base text-foreground',
  'body-sm': 'text-sm text-foreground',
  caption: 'text-xs text-muted-foreground',
  label: 'text-sm font-medium text-foreground',
  button: 'text-base font-medium text-foreground',
}

export function Text({ className, variant = 'body', style, ...textProps }: TextProps) {
  const variantClassName = variantStyles[variant]

  return <RNText className={cn(variantClassName, className)} style={style} {...textProps} />
}
