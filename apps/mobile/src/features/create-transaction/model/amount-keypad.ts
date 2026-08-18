// Pure transition function behind the custom amount keypad. The form's amount
// stays the same locale string the old TextInput produced ("125,50"), so the
// zod schema and `parseMajorUnitsToMinor` are untouched; the keypad is only a
// different way to edit that string. Shaped as (value, key) => value so
// arithmetic operator keys can be added later without touching the UI.

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'separator'
  | 'backspace'

// Locale decimal separator of the amount string (TODO(i18n): with en).
const SEPARATOR = ','

// All supported currencies are divisor-100, so two fraction digits is the
// hard ceiling; nine integer digits (999 999 999,99) keeps the display and
// int64 minor units comfortable.
const MAX_FRACTION_DIGITS = 2
const MAX_INTEGER_DIGITS = 9

export function applyKeypadInput(value: string, key: KeypadKey): string {
  if (key === 'backspace') return value.slice(0, -1)

  if (key === 'separator') {
    if (value.includes(SEPARATOR)) return value
    return value === '' ? `0${SEPARATOR}` : `${value}${SEPARATOR}`
  }

  const separatorIndex = value.indexOf(SEPARATOR)

  if (separatorIndex !== -1) {
    const fraction = value.slice(separatorIndex + 1)
    if (fraction.length >= MAX_FRACTION_DIGITS) return value
    return value + key
  }

  // Integer-only: a lone leading zero is replaced ("0" + "5" -> "5").
  const next = value === '0' ? key : value + key
  return next.length > MAX_INTEGER_DIGITS ? value : next
}
