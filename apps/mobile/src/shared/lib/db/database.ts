// Runtime wiring of the local database: opens the on-device SQLite file
// (expo-sqlite, JSI - bundled with Expo Go) and applies drizzle-kit
// migrations at app start. Unit tests bypass this module and build a drizzle
// instance over the Node sqlite adapter instead (see ./testing).

import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import { openDatabaseSync } from 'expo-sqlite'
import * as schema from './schema'
import { migrations } from './migrations.generated'

export type LocalDatabase = ExpoSQLiteDatabase<typeof schema>

/** Transaction handle handed to `db.transaction` callbacks. */
export type LocalTransaction = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]

const DATABASE_NAME = 'expense-tracker.db'

let databasePromise: Promise<LocalDatabase> | null = null

/**
 * Opens (and migrates) the local database exactly once per process. Safe to
 * call repeatedly; concurrent callers await the same promise so no query can
 * run before migrations have committed.
 */
export function openLocalDatabase(): Promise<LocalDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const sqlite = openDatabaseSync(DATABASE_NAME)
      const db = drizzle(sqlite, { schema })
      await migrate(db, migrations)
      return db
    })()
  }
  return databasePromise
}
