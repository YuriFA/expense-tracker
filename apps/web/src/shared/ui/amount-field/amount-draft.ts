import { toMajorUnits, toMinorUnits } from '@/shared/lib/money'

export type AmountFieldMode = 'positive' | 'signed'

export interface ParsedAmountDraft {
  kind: 'empty' | 'partial' | 'valid'
  value?: number
}

export interface SanitizedDraft {
  draft: string
  selectionStart: number
}

const DIGIT_RE = /^\d$/
const PARTIAL_AMOUNT_RE = /^[+-]?$|^[+-]?[.,]$|^[+-]?\d+[.,]$/
const VALID_AMOUNT_RE = /^[+-]?(?:\d+(?:[.,]\d{1,2})?|[.,]\d{1,2})$/
const WHITESPACE_RE = /[\s\u00A0\u202F]/g
const DISALLOWED_RE = /[^\d.,+-]/g

function usesRussianShape(locale: string): boolean {
  return locale.toLowerCase().startsWith('ru')
}

function decimalSeparatorFor(locale: string): '.' | ',' {
  return usesRussianShape(locale) ? ',' : '.'
}

export function defaultAmountPlaceholder(locale: string): string {
  const separator = decimalSeparatorFor(locale)
  return `0${separator}00`
}

export function formatEditableAmount(value: number, locale: string): string {
  const separator = decimalSeparatorFor(locale)
  const minor = toMinorUnits(value)
  const negative = minor < 0
  const absoluteMinor = Math.abs(minor)
  const integerPart = Math.trunc(absoluteMinor / 100)
  const fractionPart = absoluteMinor % 100
  const sign = negative ? '-' : ''

  if (fractionPart === 0) {
    return `${sign}${integerPart}`
  }

  if (fractionPart % 10 === 0) {
    return `${sign}${integerPart}${separator}${fractionPart / 10}`
  }

  return `${sign}${integerPart}${separator}${String(fractionPart).padStart(2, '0')}`
}

export function sanitizeTypedAmountDraft(
  raw: string,
  selectionStart: number,
  mode: AmountFieldMode,
): SanitizedDraft {
  let draft = ''
  let nextSelectionStart = selectionStart
  let hasSeparator = false
  let fractionDigits = 0
  let hasSign = false

  for (const [index, char] of [...raw].entries()) {
    let keep = false

    if (DIGIT_RE.test(char)) {
      keep = !hasSeparator || fractionDigits < 2
      if (keep && hasSeparator) {
        fractionDigits += 1
      }
    } else if (char === '.' || char === ',') {
      keep = !hasSeparator
      if (keep) {
        hasSeparator = true
      }
    } else if ((char === '+' || char === '-') && mode === 'signed') {
      keep = !hasSign && draft.length === 0
      if (keep) {
        hasSign = true
      }
    }

    if (keep) {
      draft += char
      continue
    }

    if (index < selectionStart) {
      nextSelectionStart -= 1
    }
  }

  return {
    draft,
    selectionStart: Math.max(0, nextSelectionStart),
  }
}

export function normalizePastedAmount(text: string, mode: AmountFieldMode): string | null {
  const filtered = text.replace(WHITESPACE_RE, '').replace(DISALLOWED_RE, '')
  if (filtered.length === 0) {
    return ''
  }

  const signChars = [...filtered].filter((char) => char === '+' || char === '-')
  if (mode === 'positive' && signChars.length > 0) {
    return null
  }
  if (signChars.length > 1) {
    return null
  }

  const sign = signChars[0] ?? ''
  if (sign !== '' && filtered[0] !== sign) {
    return null
  }

  const unsigned = filtered.replace(/[+-]/g, '')
  if (unsigned.length === 0) {
    return sign
  }

  const lastSeparatorIndex = Math.max(unsigned.lastIndexOf('.'), unsigned.lastIndexOf(','))
  const hasDecimalSeparator = lastSeparatorIndex !== -1 && countDigits(unsigned.slice(lastSeparatorIndex + 1)) <= 2

  let integerPart = ''
  let fractionPart = ''
  let separator = ''

  for (const [index, char] of [...unsigned].entries()) {
    if (!DIGIT_RE.test(char)) {
      if (hasDecimalSeparator && index === lastSeparatorIndex) {
        separator = char
      }
      continue
    }

    if (hasDecimalSeparator && index > lastSeparatorIndex) {
      if (fractionPart.length < 2) {
        fractionPart += char
      }
      continue
    }

    integerPart += char
  }

  if (separator === '') {
    return `${sign}${integerPart}`
  }

  return `${sign}${integerPart}${separator}${fractionPart}`
}

export function parseAmountDraft(draft: string): ParsedAmountDraft {
  if (draft.length === 0) {
    return { kind: 'empty' }
  }

  if (PARTIAL_AMOUNT_RE.test(draft)) {
    return { kind: 'partial' }
  }

  if (!VALID_AMOUNT_RE.test(draft)) {
    return { kind: 'partial' }
  }

  let normalized = draft.replace(',', '.')
  if (normalized.startsWith('.')) {
    normalized = `0${normalized}`
  } else if (normalized.startsWith('-.')) {
    normalized = normalized.replace('-.', '-0.')
  } else if (normalized.startsWith('+.')) {
    normalized = normalized.replace('+.', '+0.')
  }

  return {
    kind: 'valid',
    value: toMajorUnits(toMinorUnits(Number(normalized))),
  }
}

function countDigits(value: string): number {
  return [...value].filter((char) => DIGIT_RE.test(char)).length
}
