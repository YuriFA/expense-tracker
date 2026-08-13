import { View, type ViewProps } from "react-native"

export interface StackProps extends ViewProps {
  className?: string
  gap?: number | "xs" | "sm" | "md" | "lg" | "xl"
  align?: "start" | "center" | "end" | "stretch"
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
}

/**
 * Stack - Vertical layout container
 *
 * Convenience wrapper for vertical flex layouts.
 * For simple spacing, the gap prop is cleaner than Tailwind classes.
 *
 * @example
 * <Stack gap="md" align="center">...</Stack>
 */
export function Stack(props: StackProps) {
  const { className, gap, align, justify, style, ...viewProps } = props

  const gapClass = gap !== undefined ? `gap-${gap}` : ""
  const alignClass = align ? `items-${align}` : ""
  const justifyClass = justify ? `justify-${justify}` : ""

  return (
    <View
      className={`flex-col ${gapClass} ${alignClass} ${justifyClass} ${className || ""}`.trim()}
      style={style}
      {...viewProps}
    />
  )
}
