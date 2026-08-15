import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps extends ViewProps {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card',
  outlined: 'bg-card border border-border',
  elevated: 'bg-card',
}

export function Card({ variant = 'default', className, style, ...viewProps }: CardProps) {
  const variantClassName = variantStyles[variant]

  return (
    <View
      className={cn(variantClassName, 'rounded-2xl p-4', className)}
      {...viewProps}
      style={
        variant === 'elevated'
          ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 2,
            }
          : style
      }
    />
  )
}
