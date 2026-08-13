import { Pressable as RNPressable, type PressableProps as RNPressableProps } from "react-native"

export interface PressableProps extends RNPressableProps {
  className?: string
  /**
   * Hover state (web only, but included for API consistency)
   */
  hoverClassName?: string
  /**
   * Pressed state style
   */
  pressedClassName?: string
  /**
   * Focused state style
   */
  focusedClassName?: string
}

/**
 * Pressable - Interactive element wrapper
 *
 * Use this for any interactive element that isn't a specific component like Button.
 * Handles press, hover, focus states with proper accessibility.
 *
 * @example
 * <Pressable pressedClassName="bg-opacity-80" onPress={handlePress}>
 *   <Text>Click me</Text>
 * </Pressable>
 */
export function Pressable(props: PressableProps) {
  const {
    className,
    hoverClassName,
    pressedClassName,
    focusedClassName,
    style,
    children,
    ...pressableProps
  } = props

  return (
    <RNPressable
      className={className}
      style={(state) => {
        const baseStyle: any = {}
        if (state.pressed && pressedClassName) baseStyle.opacity = 0.7
        if (style) {
          if (typeof style === 'function') return [baseStyle, style(state)]
          return [baseStyle, style]
        }
        return baseStyle
      }}
      {...pressableProps}
    >
      {children}
    </RNPressable>
  )
}
