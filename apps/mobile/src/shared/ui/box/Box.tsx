import { View, type ViewProps } from "react-native"

export interface BoxProps extends ViewProps {
  className?: string
}

/**
 * Box - A flexible View wrapper for layout and styling
 *
 * This is the primitive building block for layout. Use it for:
 * - Containers and wrappers
 * - Layout composition
 * - Applying spacing, colors, borders via className
 *
 * For semantic content, prefer more specific components like Card, etc.
 */
export function Box(props: BoxProps) {
  const { className, style, ...viewProps } = props

  return <View className={className} style={style} {...viewProps} />
}
