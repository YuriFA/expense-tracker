import { Pressable } from '../pressable'
import { Icon, type IconName } from '../icon'
import type { PressableProps } from '../pressable'
import { cn } from '@/shared/lib/utils'

export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: IconName
  size?: IconButtonSize
  /** Design-token color as an `accent-…` class. @default 'accent-foreground' */
  colorClassName?: string
  /** Raw color string - only for dynamic data colors. */
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

export function IconButton({
  icon,
  size = 'md',
  color,
  colorClassName = 'accent-foreground',
  accessibilityLabel,
  disabled,
  className,
  ...pressableProps
}: IconButtonProps) {
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
      <Icon name={icon} size={iconSize} color={color} colorClassName={colorClassName} />
    </Pressable>
  )
}
