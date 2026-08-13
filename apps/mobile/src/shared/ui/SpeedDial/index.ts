export { SpeedDial } from "./SpeedDial"
export type {
  SpeedDialProps,
  SpeedDialAction,
  SpeedDialPosition,
} from "./SpeedDial.types"
// Exported for direct unit testing; SpeedDial renders actions from the array API.
export { SpeedDialAction as SpeedDialActionView } from "./SpeedDialAction"
// FAB dimension consumers need to position the SpeedDial relative to other UI
// (e.g. straddling a bottom tab bar) without hardcoding the size.
export { FAB_SIZE } from "./constants"
