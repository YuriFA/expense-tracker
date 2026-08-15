export interface SpeedDialActionItem {
  /** Stable unique id; used to build the action testID: `speed-dial-action-{id}`. */
  id: string
  icon: React.ReactNode
  /** Invoked on press (the menu closes first; never awaited). */
  onPress: () => void
  label?: string
  /**
   * Explicit accessibility label. Falls back to `label` when omitted.
   * Required in practice when there is no `label` (icon-only action).
   */
  accessibilityLabel?: string
  size?: number
}
