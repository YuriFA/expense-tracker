// Ownership gate policy (design D1): a single source of truth for the
// pass/foreign-owner decision, atomic wipe-and-rebind, and adopt-if-unowned.
// App adapters keep what is genuinely theirs: presenting the choice
// (AlertDialog vs Alert.alert), server-side logout on cancel, query-cache
// invalidation, and auth state transitions.

import type { LocalDatabase } from '../types'
import {
  getOwnerUserId,
  setOwnerUserId,
  wipeLocalDataInTx,
} from './sync-meta'

// ---------------------------------------------------------------------------
// Decision table
// ---------------------------------------------------------------------------

/** The decision of the ownership gate for a given db owner and authenticated user. */
export type OwnershipGateDecision =
  | { kind: 'pass' }
  | { kind: 'foreign-owner'; ownerUserId: string }

/**
 * Pure decision table: pass iff the database is unowned or the authenticated
 * user is already the owner; block with `foreign-owner` otherwise.
 *
 * Never touches the database - callers read the owner themselves and pass it
 * in (web reads via the RPC bridge; mobile reads directly).
 */
export function ownershipGateDecision(
  ownerUserId: string | null,
  authenticatedUserId: string,
): OwnershipGateDecision {
  if (!ownerUserId || ownerUserId === authenticatedUserId) {
    return { kind: 'pass' }
  }
  return { kind: 'foreign-owner', ownerUserId }
}

// ---------------------------------------------------------------------------
// Database effects
// ---------------------------------------------------------------------------

/**
 * Sets the owner when the database is currently unowned (the bind half of
 * `completeAuthentication`). Does nothing if an owner is already set.
 */
export function adoptUnowned(db: LocalDatabase, userId: string): void {
  if (!getOwnerUserId(db)) {
    setOwnerUserId(db, userId)
  }
}

/**
 * Wipes ALL local data and rebinds the database to a new owner in a single
 * transaction - the destructive choice when a different user logs in.
 *
 * Callers MUST invalidate every UI cache afterwards: this function only
 * touches the database; it does not know about Vue's query cache, React
 * Query's cache, or any other in-memory state.
 */
export function rebindOwner(db: LocalDatabase, userId: string): void {
  db.transaction((tx) => {
    wipeLocalDataInTx(tx)
    setOwnerUserId(tx, userId)
  })
}
