/**
 * Amount string <-> minor-units parsing for the Home amount field.
 *
 * The hero `AmountField` owns only the raw text the user types; the form model
 * parses it into integer minor units here. Money stays in minor units everywhere
 * downstream (no floats), matching the shared money model + the backend.
 *
 * The input is constrained to a plain decimal (digits + a single optional
 * separator with at most two fractional digits) so this stays locale-independent
 * and predictable for a numeric keypad.
 */

/** Max fractional digits we accept (minor-unit divisor is 100). */
const MAX_DECIMALS = 2

/**
 * Strip anything that isn't part of a plain decimal, collapse to a single dot,
 * and cap the fractional part at two digits. Used as the field's onChangeText
 * filter so the keypad can never produce an un-parseable value.
 */
export function sanitizeAmountInput(text: string): string {
  let value = text.replace(/[^\d.,]/g, '')
  // Accept both `.` and `,` as a decimal separator; normalize to `.`.
  value = value.replace(/,/g, '.')
  const firstDot = value.indexOf('.')
  if (firstDot !== -1) {
    const head = value.slice(0, firstDot)
    const tail = value.slice(firstDot + 1).replace(/\./g, '')
    value = `${head}.${tail.slice(0, MAX_DECIMALS)}`
  }
  return value
}

/**
 * Parse a sanitized amount string into minor units, or `null` when it is empty
 * or not a positive amount. Zero and negative values are invalid (a transaction
 * must move a positive sum), so they return `null` and keep the save disabled.
 */
export function parseAmountToMinor(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null
  }
  const major = Number(trimmed)
  if (!Number.isFinite(major) || major <= 0) {
    return null
  }
  // Math.round guards against the 0.1 + 0.2 class of float error.
  return Math.round(major * 100)
}

/** Render minor units back as an editable decimal string ("12.50"). */
export function minorToAmountText(minor: number): string {
  return (minor / 100).toFixed(MAX_DECIMALS)
}
