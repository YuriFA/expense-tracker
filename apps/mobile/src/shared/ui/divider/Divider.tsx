import { View } from "react-native"

export interface DividerProps {
  /**
   * Orientation of the divider
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical"
  /**
   * Additional class name
   */
  className?: string
}

/**
 * Divider - Visual separator between content
 *
 * Use to separate sections of content or create visual hierarchy.
 *
 * @example
 * <Divider />
 * <Divider orientation="vertical" />
 */
export function Divider(props: DividerProps) {
  const { orientation = "horizontal", className } = props

  if (orientation === "vertical") {
    return <View className={`w-px bg-border ${className || ""}`.trim()} />
  }

  return <View className={`h-px bg-border ${className || ""}`.trim()} />
}
