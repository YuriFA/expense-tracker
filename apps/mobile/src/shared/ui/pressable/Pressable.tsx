import { Pressable as RNPressable, type PressableProps as RNPressableProps } from "react-native"

export interface PressableProps extends RNPressableProps {
  className?: string
  /** Web-only; kept in the API for cross-platform parity. */
  hoverClassName?: string
  pressedClassName?: string
  focusedClassName?: string
}

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
