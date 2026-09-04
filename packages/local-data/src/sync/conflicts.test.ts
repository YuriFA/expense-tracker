// Tests for the conflictSubject export.

import { describe, expect, it } from 'vitest'
import { conflictSubject } from './conflicts'
import type { LocalSyncConflict } from './conflicts'

function makeConflict(
  localState: unknown,
  serverStateData?: Record<string, unknown>,
): LocalSyncConflict {
  return {
    id: 'c1',
    entity: 'category',
    entityId: 'cat-1',
    opId: null,
    kind: 'deleted',
    baseVersion: 1,
    serverVersion: 2,
    localState,
    serverState: {
      version: 2,
      deleted: true,
      data: serverStateData as never,
    },
    createdAt: '2026-01-01T00:00:00Z',
  }
}

describe('conflictSubject', () => {
  it('returns the name from localState when present', () => {
    expect(conflictSubject(makeConflict({ name: 'Кафе', description: 'Also here' }))).toBe('Кафе')
  })

  it('returns the description from localState when name is absent', () => {
    expect(conflictSubject(makeConflict({ description: 'Morning coffee' }))).toBe(
      'Morning coffee',
    )
  })

  it('falls back to serverState.data when localState is null', () => {
    expect(
      conflictSubject(makeConflict(null, { name: 'Server name' })),
    ).toBe('Server name')
  })

  it('returns an empty string when neither state carries a name or description', () => {
    expect(conflictSubject(makeConflict(null))).toBe('')
    expect(conflictSubject(makeConflict({}))).toBe('')
  })

  it('prefers localState name over serverState data', () => {
    expect(
      conflictSubject(makeConflict({ name: 'Local' }, { name: 'Server' })),
    ).toBe('Local')
  })
})
