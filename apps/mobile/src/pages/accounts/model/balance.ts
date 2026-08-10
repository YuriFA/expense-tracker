/**
 * Signed amount <-> minor-units helpers for account forms.
 *
 * The shared `@shared/lib/amount` helpers model a *positive* transaction amount
 * (they reject zero and negatives - a transaction must move a positive sum).
 * Account balances are different: a balance can be zero or negative (an account
 * in overdraft), so the balance-correction field needs its own signed parse +
 * sanitize. These stay local to the Accounts page rather than widening the
 * shared helper's contract, per the "touch only your slice" boundary.
 *
 * Money is integer minor units everywhere (no floats); `Math.round` guards the
 * 0.1 + 0.2 class of float error on the multiply.
 */

const MAX_DECIMALS = 2

/**
 * Sanitize a signed decimal input for the balance-correction field. Allows a
 * single leading `-`, one decimal separator (`.` or `,`), and caps the
 * fractional part at two digits. Everything else is stripped so the keypad can
 * never produce an un-parseable value.
 */
export function sanitizeSignedAmount(text: string): string {
  const isNegative = text.trim().startsWith('-')
  let value = text.replace(/[^\d.,]/g, '')
  value = value.replace(/,/g, '.')
  const firstDot = value.indexOf('.')
  if (firstDot !== -1) {
    const head = value.slice(0, firstDot)
    const tail = value.slice(firstDot + 1).replace(/\./g, '')
    value = `${head}.${tail.slice(0, MAX_DECIMALS)}`
  }
  return (isNegative ? '-' : '') + value
}

/**
 * Parse a signed decimal string into minor units, or `null` when it is empty or
 * not a valid decimal. Negatives and zero are valid (an account can be
 * overdrawn or sit at zero); the only invalid input is a malformed number.
 */
export function parseSignedMinor(text: string): number | null {
  const trimmed = text.trim()
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null
  }
  const major = Number(trimmed)
  if (!Number.isFinite(major)) {
    return null
  }
  return Math.round(major * 100)
}

/** Minor units -> a signed editable decimal string ("-12.50", "0.00"). */
export function minorToSignedText(minor: number): string {
  return (minor / 100).toFixed(MAX_DECIMALS)
}

/**
 * Parse a non-negative decimal into minor units for the opening-balance field
 * (design section 6: opening balance; matches the web Zod schema which is
 * `.nonnegative()`). Zero is valid (and the default). `null` means malformed.
 */
export function parseNonNegativeMinor(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return null
  }
  const major = Number(trimmed)
  if (!Number.isFinite(major)) {
    return null
  }
  return Math.round(major * 100)
}
