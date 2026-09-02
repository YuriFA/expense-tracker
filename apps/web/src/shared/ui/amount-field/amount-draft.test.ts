import { describe, expect, it } from 'vitest'
import {
  defaultAmountPlaceholder,
  formatEditableAmount,
  normalizePastedAmount,
  parseAmountDraft,
  sanitizeTypedAmountDraft,
} from './amount-draft'

describe('defaultAmountPlaceholder', () => {
  it('uses a dot for en locales', () => {
    expect(defaultAmountPlaceholder('en')).toBe('0.00')
  })

  it('uses a comma for ru locales', () => {
    expect(defaultAmountPlaceholder('ru')).toBe('0,00')
  })
})

describe('formatEditableAmount', () => {
  it('keeps whole amounts plain while editing', () => {
    expect(formatEditableAmount(1234, 'en')).toBe('1234')
  })

  it('trims trailing zeroes from the focused draft', () => {
    expect(formatEditableAmount(12.5, 'en')).toBe('12.5')
    expect(formatEditableAmount(12.05, 'en')).toBe('12.05')
  })

  it('uses the locale decimal separator', () => {
    expect(formatEditableAmount(12.5, 'ru')).toBe('12,5')
  })

  it('preserves the sign for negative amounts', () => {
    expect(formatEditableAmount(-4.5, 'en')).toBe('-4.5')
  })
})

describe('sanitizeTypedAmountDraft', () => {
  it('keeps a plain decimal draft unchanged', () => {
    expect(sanitizeTypedAmountDraft('1234.5', 6, 'positive')).toEqual({
      draft: '1234.5',
      selectionStart: 6,
    })
  })

  it('drops a third fractional digit', () => {
    expect(sanitizeTypedAmountDraft('12.345', 6, 'positive')).toEqual({
      draft: '12.34',
      selectionStart: 5,
    })
  })

  it('allows a leading sign only in signed mode', () => {
    expect(sanitizeTypedAmountDraft('-4.5', 4, 'signed')).toEqual({
      draft: '-4.5',
      selectionStart: 4,
    })
    expect(sanitizeTypedAmountDraft('-4.5', 4, 'positive')).toEqual({
      draft: '4.5',
      selectionStart: 3,
    })
  })

  it('removes spaces and currency glyphs from pasted-like input', () => {
    expect(sanitizeTypedAmountDraft('1 234,56 ₽', 10, 'positive')).toEqual({
      draft: '1234,56',
      selectionStart: 7,
    })
  })
})

describe('normalizePastedAmount', () => {
  it('normalizes a ru formatted amount with a suffix symbol', () => {
    expect(normalizePastedAmount('1 234,56 ₽', 'positive')).toBe('1234,56')
  })

  it('normalizes an en formatted amount with a prefix symbol', () => {
    expect(normalizePastedAmount('$1,234.56', 'positive')).toBe('1234.56')
  })

  it('keeps a leading sign for signed fields', () => {
    expect(normalizePastedAmount('-€1,234.56', 'signed')).toBe('-1234.56')
  })

  it('rejects signed paste in positive mode', () => {
    expect(normalizePastedAmount('-123.45', 'positive')).toBeNull()
  })
})

describe('parseAmountDraft', () => {
  it('parses a complete decimal draft', () => {
    expect(parseAmountDraft('1234.56')).toEqual({ kind: 'valid', value: 1234.56 })
  })

  it('parses a leading-separator draft', () => {
    expect(parseAmountDraft('.5')).toEqual({ kind: 'valid', value: 0.5 })
  })

  it('treats trailing separators as partial', () => {
    expect(parseAmountDraft('12,')).toEqual({ kind: 'partial' })
  })

  it('treats a lone sign as partial', () => {
    expect(parseAmountDraft('-')).toEqual({ kind: 'partial' })
  })

  it('treats an empty draft as empty', () => {
    expect(parseAmountDraft('')).toEqual({ kind: 'empty' })
  })
})
