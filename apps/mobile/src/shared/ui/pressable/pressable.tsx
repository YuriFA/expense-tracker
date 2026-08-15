import { Pressable as RNPressable, type PressableProps as RNPressableProps } from 'react-native'

export interface PressableProps extends RNPressableProps {
  className?: string
  /** Web-only; kept in the API for cross-platform parity. */
  hoverClassName?: string
  pressedClassName?: string
  focusedClassName?: string
}

export function Pressable({
  className,
  // Web-only props kept for cross-platform parity; stripped here so they
  // never reach the native component.
  hoverClassName: _hoverClassName,
  pressedClassName,
  focusedClassName: _focusedClassName,
  style,
  children,
  ...pressableProps
}: PressableProps) {
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
