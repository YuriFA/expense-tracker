import type { AppLocale } from '@/shared/config/locale'
import en from './locales/en.json'

export type MessageSchema = typeof en

export const AVAILABLE_LOCALES = ['en', 'ru'] as const satisfies readonly AppLocale[]
