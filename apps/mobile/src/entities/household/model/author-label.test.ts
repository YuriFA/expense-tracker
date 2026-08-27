import { describe, expect, it } from '@jest/globals'
import type { HouseholdMember } from '@expense-tracker/api'
import { authorLabel } from './author-label'

const ME = '11111111-1111-4111-8111-111111111111'
const SIBLING = '22222222-2222-4222-8222-222222222222'

function member(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    userId: SIBLING,
    email: 'wife@example.com',
    displayName: null,
    role: 'member',
    joinedAt: '2026-08-02T00:00:00.000Z',
    ...overrides,
  }
}

function me(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return member({ userId: ME, email: 'me@example.com', role: 'owner', ...overrides })
}

describe('authorLabel', () => {
  it('uses the email when the display name is not set', () => {
    const members = [me(), member({ displayName: null })]
    expect(authorLabel(SIBLING, members, ME)).toBe('wife@example.com')
  })

  it('prefers the display name when set', () => {
    const members = [me(), member({ displayName: 'Жена' })]
    expect(authorLabel(SIBLING, members, ME)).toBe('Жена')
  })

  it('returns null for own records unless a selfLabel is provided', () => {
    const members = [me({ displayName: 'Я' }), member()]

    expect(authorLabel(ME, members, ME)).toBeNull()
    expect(authorLabel(ME, members, ME, { selfLabel: 'вами' })).toBe('вами')
  })

  it('returns null for records without a known author', () => {
    const members = [me(), member()]
    expect(authorLabel(null, members, ME)).toBeNull()
    expect(authorLabel(undefined, members, ME)).toBeNull()
    // A departed member is no longer resolvable - no label anywhere.
    expect(authorLabel('33333333-3333-4333-8333-333333333333', members, ME)).toBeNull()
  })

  it('returns null in a single-member household unless details opt in', () => {
    const members = [me({ displayName: 'Я' })]

    expect(authorLabel(ME, members, ME)).toBeNull()
    // The detail view shows provenance even alone (design D2).
    expect(authorLabel(ME, members, ME, { selfLabel: 'вами', includeSingleMember: true })).toBe(
      'вами',
    )
  })

  it('resolves siblings even while the current user id is unknown', () => {
    // Anonymous-era local data: markers can still resolve against members.
    const members = [me({ userId: 'someone-else' }), member({ displayName: 'Жена' })]
    expect(authorLabel(SIBLING, members, undefined)).toBe('Жена')
  })
})
