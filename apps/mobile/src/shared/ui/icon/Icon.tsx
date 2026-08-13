import { Ionicons } from "@expo/vector-icons"
import type { IconProps } from "@expo/vector-icons/build/createIconSet"
import { Text } from "../text"

export interface CustomIconProps extends Omit<IconProps<string>, "name"> {
  name: string
  /**
   * Size of the icon
   * @default 24
   */
  size?: number
  /**
   * Color class or color name
   * @default "text-foreground"
   */
  color?: string | undefined
}

/**
 * Icon - Icon component using Ionicons
 *
 * Provides a consistent icon API across the app.
 * Uses Ionicons from @expo/vector-icons.
 *
 * @example
 * <Icon name="search" size={20} />
 * <Icon name="chevron-back" color="text-primary" />
 *
 * See available icons: https://icons.expo.fyi/
 */
export function Icon(props: CustomIconProps) {
  const { name, size = 24, color, style, ...iconProps } = props

  return (
    <Ionicons
      name={name as any}
      size={size}
      color={color as any}
      style={style}
      {...iconProps}
    />
  )
}
