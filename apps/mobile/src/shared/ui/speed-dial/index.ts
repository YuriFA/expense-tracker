export { SpeedDial } from './speed-dial'
export type { SpeedDialActionItem as SpeedDialAction, SpeedDialPosition } from './speed-dial.types'
// Exported for direct unit testing; SpeedDial renders actions from the array API.
export { SpeedDialAction as SpeedDialActionView } from './speed-dial-action'
// FAB dimension consumers need to position the SpeedDial relative to other UI
// (e.g. straddling a bottom tab bar) without hardcoding the size.
export { FAB_SIZE } from './constants'
