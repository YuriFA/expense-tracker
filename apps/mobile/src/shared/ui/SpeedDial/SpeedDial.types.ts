import type { SharedValue } from "react-native-reanimated"

/** Where the FAB anchors horizontally. */
export type SpeedDialPosition = "bottom-right" | "bottom-left" | "center"

/**
 * A single action rendered inside the SpeedDial. The component is generic -
 * `id`, `icon`, `onPress` and optional `label` are all the caller's concern.
 */
export interface SpeedDialAction {
  /** Stable unique id; used to build the action testID: `{base}-action-{id}`. */
  id: string
  /** Icon node shown in the action's circular button. */
  icon: React.ReactNode
  /** Invoked on press (the menu closes first; never awaited). */
  onPress: () => void
  /** Optional label pill shown beside the icon. */
  label?: string
  /** Visually disabled and non-interactive; keeps a correct a11y state. */
  disabled?: boolean
  /**
   * Explicit accessibility label. Falls back to `label` when omitted.
   * Required in practice when there is no `label` (icon-only action).
   */
  accessibilityLabel?: string
}

export interface SpeedDialProps {
  /** Actions to render, bottom-most (nearest the FAB) first. */
  actions: SpeedDialAction[]

  /** Controlled open state. Omit for uncontrolled usage. */
  open?: boolean
  /** Initial open state for uncontrolled usage. @default false */
  defaultOpen?: boolean
  /** Called with the next open state (controlled and uncontrolled). */
  onOpenChange?: (open: boolean) => void

  /** Custom closed-state icon for the FAB. Defaults to an `add` glyph. */
  icon?: React.ReactNode
  /**
   * Custom open-state icon. When both `icon` and `closeIcon` are provided the
   * two cross-fade; otherwise the single icon rotates 0->45deg on open.
   */
  closeIcon?: React.ReactNode
  /** FAB accessibility label when closed. @default "More actions" */
  label?: string
  /** FAB accessibility label when open. @default "Close actions" */
  closeLabel?: string

  /**
   * Horizontal anchoring. `bottom-right` / `bottom-left` pin the FAB to a corner
   * via `horizontalOffset`; `center` spans the full width and self-centers the
   * FAB and action column (used for a central tab-bar FAB). @default "bottom-right"
   */
  position?: SpeedDialPosition
  /**
   * Distance from the viewport's bottom edge to the FAB's bottom edge.
   * Defaults to the safe-area bottom inset + edge margin. When mounting over a
   * bottom tab bar pass the measured tab-bar height (already including its
   * safe-area padding) minus the desired overlap, e.g. `tabBarHeight - FAB_SIZE/2`
   * to straddle the bar's top edge - the component never hardcodes the tab-bar
   * height. Ignored for `horizontalOffset` when `position="center"`.
   */
  bottomOffset?: number
  /**
   * Distance from the near horizontal edge. Defaults to safe-area inset + margin.
   * Ignored when `position="center"` (the FAB self-centers).
   */
  horizontalOffset?: number

  /** Show the dimmed scrim. @default true */
  backdrop?: boolean
  /** Peak scrim opacity. @default 0.5 */
  backdropOpacity?: number
  /** Vertical gap between stacked actions, in px. */
  actionSpacing?: number

  /** Disable the whole SpeedDial - the FAB will not open. */
  disabled?: boolean

  /** Base testID. Derives `{base}-fab`, `{base}-backdrop`, `{base}-action-{id}`. @default "speed-dial" */
  testID?: string
}

/**
 * Props passed from SpeedDial to a single SpeedDialAction. The `progress`
 * shared value is the single source of animation truth; the action derives its
 * appear/disappear style from it (race-free, no per-action timers).
 */
export interface SpeedDialActionViewProps {
  action: SpeedDialAction
  index: number
  progress: SharedValue<number>
  spacing: number
  position: SpeedDialPosition
  testID: string
  reducedMotion: boolean
  /** React open state - gates pointer events / a11y (the shared value drives visuals). */
  open: boolean
}
