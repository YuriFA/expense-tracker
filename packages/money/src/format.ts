import { toDecimal } from 'dinero.js'
import type { CurrencyCode } from './currencies'
import { toMoney } from './money'

/**
 * Narrow currency symbol for the supported currencies. A static map keeps
 * formatting deterministic and `Intl`-free (Hermes-safe on React Native);
 * unknown currencies fall back to their ISO code.
 */
const CURRENCY_SYMBOLS: Partial<Record<CurrencyCode, string>> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
}

/** The two locales the app supports; anything else resolves to the `en` shape. */
type SupportedShape = 'en' | 'ru'

/** Per-locale number shaping: grouping, decimal separator, symbol placement. */
interface LocaleShape {
  groupSeparator: string
  decimalSeparator: string
  /** Currency symbol before (`prefix`) or after (`suffix`) the amount. */
  symbolPlacement: 'prefix' | 'suffix'
  /** Separator between the amount and a suffix symbol (empty for prefix). */
  symbolSeparator: string
}

const LOCALE_SHAPES: Record<SupportedShape, LocaleShape> = {
  en: {
    groupSeparator: ',',
    decimalSeparator: '.',
    symbolPlacement: 'prefix',
    symbolSeparator: '',
  },
  ru: {
    // Narrow no-break space grouping is the ru-RU typographic convention and
    // avoids a stray regular space that could wrap mid-number.
    groupSeparator: '\u202F',
    decimalSeparator: ',',
    symbolPlacement: 'suffix',
    // No-break space keeps the symbol glued to the amount across line breaks.
    symbolSeparator: '\u00A0',
  },
}

/** Resolve a BCP-47 locale string to the closest supported shape (default en). */
function shapeFor(locale: string): LocaleShape {
  return locale.toLowerCase().startsWith('ru') ? LOCALE_SHAPES.ru : LOCALE_SHAPES.en
}

/** Insert `separator` every three digits from the right of an unsigned int. */
function groupThousands(digits: string, separator: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

/**
 * Format a minor-units amount for display, locale- and currency-aware, with NO
 * `Intl` dependency (Hermes-safe on React Native; identical output on web).
 *
 * The decimal value comes from dinero.js's `toDecimal` (pure integer math, no
 * floats); locale grouping, separators, and symbol placement are applied by
 * hand. All supported currencies are 2-minor-unit, so the result always shows
 * exactly two fractional digits.
 *
 * Examples: en `$1,234.50`, `-$100.00`; ru `1 234,50 ₽`. A leading minus sign
 * is always placed before the currency symbol.
 */
export function formatMoney(amountMinor: number, currency: CurrencyCode, locale: string): string {
  const money = toMoney(amountMinor, currency)
  // `toDecimal` returns e.g. "1234.50", "-0.50" - sign already embedded, no
  // grouping, fractional digits padded to the currency exponent.
  const decimal = toDecimal(money)

  const negative = decimal.startsWith('-')
  const unsigned = negative ? decimal.slice(1) : decimal
  const [integerPart = '0', fractionPart = ''] = unsigned.split('.')

  const shape = shapeFor(locale)
  const numberBody = fractionPart
    ? `${groupThousands(integerPart, shape.groupSeparator)}${shape.decimalSeparator}${fractionPart}`
    : groupThousands(integerPart, shape.groupSeparator)
  const sign = negative ? '-' : ''
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency

  return shape.symbolPlacement === 'prefix'
    ? `${sign}${symbol}${numberBody}`
    : `${sign}${numberBody}${shape.symbolSeparator}${symbol}`
}
