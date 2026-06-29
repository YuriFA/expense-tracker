import type { Settings } from '../types/settings'
import { DEFAULT_CURRENCY } from './currencies'
import { DEFAULT_LOCALE } from './locale'

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  theme: 'light',
}
