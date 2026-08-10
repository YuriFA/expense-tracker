import { APP_NAME } from './app'

/**
 * Namespaced storage keys. MMKV (settings) and SQLite (domain) use disjoint
 * namespaces, so these only cover the MMKV-backed settings + a few KV caches.
 */
export const STORAGE_KEYS = {
  settings: `${APP_NAME}:settings`,
  /** Last-used account per entry mode, so the Home form re-selects it on reopen. */
  lastAccountIds: `${APP_NAME}:last-account-ids`,
} as const

/**
 * SQLite database file name. `expo-sqlite` opens it inside the app's sandboxed
 * document directory; a single file holds every domain table.
 */
export const DATABASE_NAME = `${APP_NAME.toLowerCase()}.db` as const
