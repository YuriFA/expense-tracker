import en from './locales/en.json'
import ru from './locales/ru.json'

/** The shape of a message bundle, derived from the English source of truth. */
export type MessageSchema = typeof en

/** All locale bundles keyed by locale code (EN/RU). */
export const messages = { en, ru }
