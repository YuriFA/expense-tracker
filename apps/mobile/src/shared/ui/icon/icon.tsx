import { Ionicons } from '@expo/vector-icons'
import type { IconProps } from '@expo/vector-icons/build/createIconSet'

// Available icon names: https://icons.expo.fyi/
export interface CustomIconProps extends Omit<IconProps<string>, 'name'> {
  name: string
  size?: number
  color?: string | undefined
}

export function Icon(props: CustomIconProps) {
  const { name, size = 24, color, style, ...iconProps } = props

  return (
    <Ionicons name={name as any} size={size} color={color as any} style={style} {...iconProps} />
  )
}
