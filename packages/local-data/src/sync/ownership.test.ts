import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDatabase } from '../testing/test-database'
import type { LocalDatabase } from '../types'
import { categories, syncMeta } from '../schema'
import { getOwnerUserId, setOwnerUserId } from './sync-meta'
import { adoptUnowned, ownershipGateDecision, rebindOwner } from './ownership'

const USER_A = '11111111-1111-4111-8111-111111111111'
const USER_B = '22222222-2222-4222-8222-222222222222'

let db: LocalDatabase

beforeEach(async () => {
  db = await createTestDatabase()
})

// ---------------------------------------------------------------------------
// ownershipGateDecision
// ---------------------------------------------------------------------------

describe('ownershipGateDecision', () => {
  it('passes when the database is unowned', () => {
    expect(ownershipGateDecision(null, USER_A)).toEqual({ kind: 'pass' })
  })

  it('passes when the authenticated user is the owner', () => {
    expect(ownershipGateDecision(USER_A, USER_A)).toEqual({ kind: 'pass' })
  })

  it('blocks when a different user is the owner', () => {
    expect(ownershipGateDecision(USER_A, USER_B)).toEqual({
      kind: 'foreign-owner',
      ownerUserId: USER_A,
    })
  })

  it('passes when authenticated user id matches the owner exactly', () => {
    expect(ownershipGateDecision(USER_A, USER_A)).toEqual({ kind: 'pass' })
  })
})

// ---------------------------------------------------------------------------
// adoptUnowned
// ---------------------------------------------------------------------------

describe('adoptUnowned', () => {
  it('binds the owner when the database is unowned', () => {
    expect(getOwnerUserId(db)).toBeNull()
    adoptUnowned(db, USER_A)
    expect(getOwnerUserId(db)).toBe(USER_A)
  })

  it('is a no-op when an owner is already set', () => {
    setOwnerUserId(db, USER_A)
    adoptUnowned(db, USER_B) // should not overwrite
    expect(getOwnerUserId(db)).toBe(USER_A)
  })
})

// ---------------------------------------------------------------------------
// rebindOwner
// ---------------------------------------------------------------------------

describe('rebindOwner', () => {
  it('wipes all local data and sets the new owner atomically', async () => {
    // Seed a category and set an existing owner so we can verify the wipe.
    setOwnerUserId(db, USER_A)
    await db.insert(categories).values({
      id: 'cat-1',
      name: 'Кафе',
      type: 'expense',
      icon: 'cafe',
      color: '#fff',
      version: 1,
      serverVersion: 0,
      deletedAt: null,
      createdAt: new Date().toISOString(),
    })
    expect(db.select().from(categories).all()).toHaveLength(1)

    rebindOwner(db, USER_B)

    expect(db.select().from(categories).all()).toHaveLength(0)
    expect(getOwnerUserId(db)).toBe(USER_B)
  })

  it('works on an unowned database (clears nothing, sets owner)', () => {
    expect(getOwnerUserId(db)).toBeNull()
    rebindOwner(db, USER_A)
    expect(getOwnerUserId(db)).toBe(USER_A)
  })

  it('removes the old owner marker entirely during the wipe', () => {
    setOwnerUserId(db, USER_A)

    // The owner key must be gone after the wipe - rebind then sets it fresh.
    rebindOwner(db, USER_B)

    // Verify via the raw meta table: only the new key should exist.
    const ownerRows = db
      .select()
      .from(syncMeta)
      .all()
      .filter((row) => row.key === 'owner_user_id')
    expect(ownerRows).toHaveLength(1)
    expect(ownerRows[0]?.value).toBe(USER_B)
  })
})
