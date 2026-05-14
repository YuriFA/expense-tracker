import type { AppLocale } from '@/app/i18n/schema'

export interface Settings {
  locale: AppLocale
  currency: string
  theme: 'light' | 'dark'
}
