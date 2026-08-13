import { Pressable } from "../pressable"
import { Icon } from "../icon"
import type { PressableProps } from "../pressable"
import { View } from "react-native"

export type IconButtonSize = "sm" | "md" | "lg"

export interface IconButtonProps extends Omit<PressableProps, "children"> {
  /**
   * Icon name from Ionicons
   */
  icon: string
  /**
   * Size of the button
   * @default "md"
   */
  size?: IconButtonSize
  /**
   * Icon color class
   */
  color?: string
  /**
   * Accessibility label (required for icon buttons)
   */
  accessibilityLabel: string
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
}

const iconSizes: Record<IconButtonSize, number> = {
  sm: 18,
  md: 24,
  lg: 28,
}

/**
 * IconButton - Button with an icon
 *
 * Use for icon-only actions like edit, delete, close, back, etc.
 * Always provide a meaningful accessibilityLabel.
 *
 * @example
 * <IconButton icon="close" accessibilityLabel="Close" onPress={handleClose} />
 * <IconButton icon="create" accessibilityLabel="Edit" color="text-primary" />
 */
export function IconButton(props: IconButtonProps) {
  const {
    icon,
    size = "md",
    color = "text-foreground",
    accessibilityLabel,
    disabled,
    style,
    className,
    ...pressableProps
  } = props

  const sizeClassName = sizeStyles[size]
  const iconSize = iconSizes[size]

  return (
    <Pressable
      className={`${sizeClassName} ${className || ""}`.trim()}
      style={(state) => {
        const baseStyle: any = {}
        if (disabled) baseStyle.opacity = 0.5
        else if (state.pressed) baseStyle.opacity = 0.7
        if (style) {
          if (typeof style === 'function') return [baseStyle, style(state)]
          return [baseStyle, style]
        }
        return baseStyle
      }}
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
