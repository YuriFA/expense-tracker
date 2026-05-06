export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
}
export const DEFAULT_CURRENCY = 'USD' as keyof typeof CURRENCY_SYMBOLS
export const AVAILABLE_CURRENCIES = Object.keys(
  CURRENCY_SYMBOLS,
) as (keyof typeof CURRENCY_SYMBOLS)[]
