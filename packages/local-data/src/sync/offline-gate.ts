// Dev-build-only network gate for e2e flows (design: add-debts task 7.3).
// Maestro cannot toggle the simulator network (runScript can't reach it) and
// loopback is unaffected by device Wi-Fi, so the ONLY reliable mid-flow
// offline mechanism is an in-app gate that makes the sync transport fail.
// The flag persists in `sync_meta` so it survives app restarts (flow 15
// restarts the app while offline). It is deliberately NOT wiped with user
// data: it is a device-level dev setting, not user state.
//
// Production builds never render the toggle (Settings gates it behind
// __DEV__), so the gate can only ever be enabled on dev builds.

import type { LocalDatabase } from '../types'
import { getMetaValue, setMetaValue } from './sync-meta'

const OFFLINE_GATE_KEY = 'dev_offline_gate'

/** True when the dev offline gate blocks the sync transport. */
export function isOfflineGateEnabled(db: LocalDatabase): boolean {
  return getMetaValue(db, OFFLINE_GATE_KEY) === '1'
}

/** Enables/disables the dev offline gate (persists across restarts). */
export function setOfflineGate(db: LocalDatabase, enabled: boolean): void {
  setMetaValue(db, OFFLINE_GATE_KEY, enabled ? '1' : '0')
}
