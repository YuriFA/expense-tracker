import { View } from 'react-native'
import { Text } from '../text'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'destructive'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-muted', text: 'text-foreground' },
  primary: { bg: 'bg-primary', text: 'text-primary-foreground' },
  secondary: { bg: 'bg-secondary', text: 'text-secondary-foreground' },
  success: { bg: 'bg-success', text: 'text-success-foreground' },
  warning: { bg: 'bg-warning', text: 'text-warning-foreground' },
  destructive: { bg: 'bg-destructive', text: 'text-destructive-foreground' },
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 rounded-md',
  md: 'px-2.5 py-1 rounded-md',
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const { bg: bgClassName, text: textClassName } = variantStyles[variant]
  const sizeClassName = sizeStyles[size]

  return (
    <View className={`${bgClassName} ${sizeClassName} self-start ${className || ''}`.trim()}>
      <Text variant="body-sm" className={textClassName}>
        {children}
      </Text>
    </View>
  )
}
