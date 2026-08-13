import { Easing } from "react-native-reanimated"

/**
 * Internal dimensions for the SpeedDial.
 *
 * These are component-specific layout numbers (like IconButton's icon sizes),
 * NOT design tokens - the token system covers colors / spacing / radius /
 * typography, not "FAB size". Colors and radii are still consumed as NativeWind
 * classes that resolve the design tokens.
 */
export const FAB_SIZE = 56
export const FAB_ICON_SIZE = 28
export const ACTION_TARGET = 44 // minimum accessible touch target (>=44pt)
export const ACTION_ICON_SIZE = 22
export const DEFAULT_EDGE_MARGIN = 16 // px gap from the viewport edge

/**
 * Animation timing. Tuned for a quick, physical expansion with no perceivable
 * lag. Durations are in ms.
 */
export const OPEN_DURATION = 220
export const CLOSE_DURATION = 180
export const REDUCED_MOTION_DURATION = 90
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1) // easeOutQuint-ish
export const REDUCED_EASE = Easing.linear

/**
 * Per-action stagger, expressed as fractions of the [0,1] `progress` shared
 * value so the whole sequence is driven by a single source of truth (no timers).
 * Action i starts animating at `i * STAGGER` and finishes by
 * `i * STAGGER + STAGGED_SEGMENT`.
 */
export const STAGGER = 0.1
export const STAGGERED_SEGMENT = 0.5
export const ACTION_TRANSLATE = 16 // px the action rises on open
export const ACTION_SCALE_MIN = 0.8

/** Default scrim opacity. Overridable via the `backdropOpacity` prop. */
export const DEFAULT_BACKDROP_OPACITY = 0.5

export const DEFAULT_TEST_ID = "speed-dial"

/** Domain-free default accessibility labels. */
export const DEFAULT_LABEL = "More actions"
export const DEFAULT_CLOSE_LABEL = "Close actions"
export const DEFAULT_BACKDROP_LABEL = "Close menu"
