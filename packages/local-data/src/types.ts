// The package-local database types: the generic drizzle SQLite surface every
// module here runs against. Apps open their own driver (expo-sqlite on
// mobile, a browser SQLite on web) and satisfy this type structurally — the
// package itself stays free of any driver/expo types (design D2).

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import type * as schema from './schema'

/**
 * The statement result every synchronous driver returns. `changes` is the
 * part the drivers guarantee in common; expo-sqlite's `SQLiteRunResult`
 * stops there, other drivers also report the last insert row id.
 */
export interface LocalRunResult {
  changes: number
  lastInsertRowid?: number | null
}

/** A synchronous-result drizzle database over the local-data schema. */
export type LocalDatabase = BaseSQLiteDatabase<'sync', LocalRunResult, typeof schema>

/** Transaction handle handed to `db.transaction` callbacks. */
export type LocalTransaction = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]
