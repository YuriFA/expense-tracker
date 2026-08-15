import { Pressable } from '../pressable'
import { Icon } from '../icon'
import type { PressableProps } from '../pressable'
import { cn } from '@/shared/lib/utils'

export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: string
  size?: IconButtonSize
  color?: string
  accessibilityLabel: string
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
}

const iconSizes: Record<IconButtonSize, number> = {
  sm: 18,
  md: 24,
  lg: 28,
}

export function IconButton(props: IconButtonProps) {
  const {
    icon,
    size = 'md',
    color = 'text-foreground',
    accessibilityLabel,
    disabled,
    className,
    ...pressableProps
  } = props

  const sizeClassName = sizeStyles[size]
  const iconSize = iconSizes[size]

  return (
    <Pressable
      className={cn(sizeClassName, className, 'active:opacity-70', {
        'opacity-50': disabled,
      })}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled ?? false }}
      {...pressableProps}
    >
      <Icon name={icon} size={iconSize} color={color} />
    </Pressable>
  )
}
