import { View, type ViewProps } from 'react-native'

export type CardVariant = 'default' | 'outlined' | 'elevated'

export interface CardProps extends ViewProps {
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-card',
  outlined: 'bg-card border border-border',
  elevated: 'bg-card',
}

export function Card(props: CardProps) {
  const { variant = 'default', className, style, ...viewProps } = props

  const variantClassName = variantStyles[variant]

  return (
    <View
      className={`${variantClassName} rounded-2xl p-4 ${className || ''}`.trim()}
      {...viewProps}
      style={
        variant === 'elevated'
          ? {
              backgroundColor: '#fff',
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
