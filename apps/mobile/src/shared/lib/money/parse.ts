// Single place where a user-typed decimal becomes integer minor units.
// The one sanctioned x100 rounding (Math.round) happens here, at the
// boundary; everything downstream is integer arithmetic.

import { toMinorUnits } from '@expense-tracker/money'

/** Parses "12,50" / "12.50" into minor units; null when unparseable. */
export function parseMajorUnitsToMinor(input: string): number | null {
  const normalized = input.trim().replace(',', '.')
  if (!normalized) return null
  const major = Number(normalized)
  if (!Number.isFinite(major)) return null
  return toMinorUnits(major)
}

/**
 * Canonicalizes raw text-input text into an amount string ("31 343,5 " or
 * "31343.5" -> "31343,5"): digits only, one "," separator, at most two
 * fraction digits. Grouping spaces and the "." separator are normalized away
 * so the form value always matches the keypad-string format.
 */
export function sanitizeAmountInput(input: string): string {
  const normalized = input
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/\./g, ',')
    .replace(/[^0-9,]/g, '')
  const [integer = '', fraction] = normalized.split(',')
  return fraction === undefined ? integer : `${integer},${fraction.slice(0, 2)}`
}
