import { asInteger, asNonEmptyString, asString, isRecord } from '../lib/normalize'

export interface Debtor {
  id: string
  name: string
  /** Optional free-form note; always a string on the wire (never null). */
  note: string
  /** Optimistic-concurrency revision (bumped on every server update). */
  version: number
}

export const normalizeDebtor = (value: unknown): Debtor | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const name = asNonEmptyString(value.name)
  const note = asString(value.note) ?? ''
  const version = asInteger(value.version)

  if (!id || !name || version === null) {
    return null
  }

  return {
    id,
    name,
    note,
    version,
  }
}
