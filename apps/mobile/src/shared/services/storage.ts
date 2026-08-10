import { MMKV } from 'react-native-mmkv'

/**
 * Single MMKV instance for app settings (locale / currency / theme). MMKV is
 * synchronous - the closest RN analog to the web's localStorage - so settings
 * (especially theme + locale) are available before the first paint.
 *
 * The domain data (accounts / categories / transactions) is NOT stored here:
 * it lives in SQLite (see `services/database`), the design's recommendation for
 * relational data with queryable filters + cursor pagination.
 */
const storage = new MMKV({ id: 'expense-tracker-settings' })

export const settingsStorage = {
  get<T>(key: string): T | null {
    const value = storage.getString(key)
    return value ? (JSON.parse(value) as T) : null
  },
  set<T>(key: string, value: T): void {
    storage.set(key, JSON.stringify(value))
  },
  remove(key: string): void {
    storage.delete(key)
  },
}
