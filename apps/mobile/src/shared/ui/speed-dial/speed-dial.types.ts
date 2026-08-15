export type SpeedDialPosition = 'bottom-right' | 'bottom-left' | 'center'

export interface SpeedDialActionItem {
  /** Stable unique id; used to build the action testID: `{base}-action-{id}`. */
  id: string
  icon: React.ReactNode
  /** Invoked on press (the menu closes first; never awaited). */
  onPress: () => void
  label?: string
  disabled?: boolean
  /**
   * Explicit accessibility label. Falls back to `label` when omitted.
   * Required in practice when there is no `label` (icon-only action).
   */
  accessibilityLabel?: string
  size?: number
}
