/**
 * Jest setup for @expense-tracker/mobile.
 *
 * Mocks `react-native-reanimated` so animated components render synchronously.
 * Reanimated 4.x ships no jest helpers in its built `lib`, and its UI-thread
 * worklet runtime isn't available under jest. Our tests assert React-state-driven
 * observable behavior (a11y states, callbacks, element presence) - never
 * animation frame values - so a synchronous JS mock is sufficient and faithful.
 */
jest.mock("@expo/vector-icons", () => {
  const React = require("react")
  const { Text } = require("react-native")
  // Synchronous stub so the default FAB glyph doesn't kick off async font
  // loading (which warns about setState outside `act` in RNTL).
  const Stub = React.forwardRef((props, ref) =>
    React.createElement(Text, { ref }, props.name ? `icon:${props.name}` : "icon"),
  )
  Stub.displayName = "VectorIcon"
  return {
    __esModule: true,
    Ionicons: Stub,
    createIconSet: () => Stub,
  }
})

jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native")

  const Animated = {
    View,
    createAnimatedComponent: (Component) => Component,
  }

  const useSharedValue = (initial) => ({
    value: typeof initial === "function" ? initial() : initial,
  })
  const useDerivedValue = (fn) => ({ value: fn() })
  const useReducedMotion = () => false
  // Execute the worklet once on the JS thread and return its style. Wrapped in
  // try/catch so a worklet-transform edge case never breaks a render.
  const useAnimatedStyle = (fn) => {
    try {
      return fn() || {}
    } catch {
      return {}
    }
  }
  const useAnimatedProps = () => ({})
  const useAnimatedReaction = () => {}

  // Animations resolve instantly to their target.
  const withTiming = (toValue) => toValue
  const withSpring = (toValue) => toValue
  const withDelay = (_delay, value) => value
  const withSequence = (...values) => values[values.length - 1]
  const withRepeat = (value) => value
  const withDecay = () => 0
  const cancelAnimation = () => {}

  const Extrapolation = { CLAMP: "clamp", IDENTITY: "identity", EXTEND: "extend" }
  const ReduceMotion = { System: "system", Always: "always", Never: "never" }
  const Easing = {
    bezier: () => () => 0,
    linear: () => () => 0,
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
  }

  const interpolate = (value, inputRange, outputRange) => {
    if (value <= inputRange[0]) return outputRange[0]
    if (value >= inputRange[inputRange.length - 1]) {
      return outputRange[outputRange.length - 1]
    }
    for (let i = 0; i < inputRange.length - 1; i++) {
      if (value >= inputRange[i] && value <= inputRange[i + 1]) {
        const t = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i])
        return outputRange[i] + (outputRange[i + 1] - outputRange[i]) * t
      }
    }
    return outputRange[0]
  }

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

  return {
    __esModule: true,
    default: Animated,
    Animated,
    useSharedValue,
    useDerivedValue,
    useReducedMotion,
    useAnimatedStyle,
    useAnimatedProps,
    useAnimatedReaction,
    withTiming,
    withSpring,
    withDelay,
    withSequence,
    withRepeat,
    withDecay,
    cancelAnimation,
    Extrapolation,
    ReduceMotion,
    Easing,
    interpolate,
    clamp,
  }
})
