import { View, type ViewProps } from 'react-native'
import { cn } from '@/shared/lib/utils'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps extends ViewProps {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card',
  outlined: 'bg-card border border-border',
  // `shadow-card` is the soft-brutalist offset contour defined in global.css.
  elevated: 'bg-card shadow-card',
}

export function Card({ variant = 'default', className, ...viewProps }: CardProps) {
  const variantClassName = variantStyles[variant]

  return <View className={cn(variantClassName, 'rounded-3xl p-4', className)} {...viewProps} />
}
