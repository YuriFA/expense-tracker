import { asDateTimeString, asNonEmptyString, asString, isRecord } from '../lib/normalize'

export type HouseholdRole = 'owner' | 'member'

export interface HouseholdMember {
  userId: string
  email: string
  /** Display name; null when never set (consumers fall back to email). */
  displayName: string | null
  role: HouseholdRole
  joinedAt: string
}

export interface Household {
  id: string
  createdAt: string
  members: HouseholdMember[]
}

const isHouseholdRole = (value: unknown): value is HouseholdRole =>
  value === 'owner' || value === 'member'

export const normalizeHouseholdMember = (value: unknown): HouseholdMember | null => {
  if (!isRecord(value)) {
    return null
  }

  const userId = asNonEmptyString(value.userId)
  const email = asNonEmptyString(value.email)
  const displayName = value.displayName === null ? null : asString(value.displayName)
  const role = isHouseholdRole(value.role) ? value.role : null
  const joinedAt = asDateTimeString(value.joinedAt)

  if (!userId || !email || displayName === null || !role || !joinedAt) {
    return null
  }

  return { userId, email, displayName, role, joinedAt }
}

export const normalizeHousehold = (value: unknown): Household | null => {
  if (!isRecord(value) || !Array.isArray(value.members)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const createdAt = asDateTimeString(value.createdAt)
  if (!id || !createdAt) {
    return null
  }

  const members: HouseholdMember[] = []
  for (const raw of value.members) {
    const member = normalizeHouseholdMember(raw)
    if (!member) {
      return null
    }
    members.push(member)
  }

  return { id, createdAt, members }
}
