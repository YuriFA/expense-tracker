import en from './locales/en.json'

export type MessageSchema = typeof en
export type AppLocale = 'en' | 'ru'

export const AVAILABLE_LOCALES = ['en', 'ru'] as const satisfies readonly AppLocale[]
