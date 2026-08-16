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
