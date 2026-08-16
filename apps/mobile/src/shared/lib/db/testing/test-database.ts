// Test-only database factory: builds the SAME drizzle expo-sqlite database
// the app uses, but over Node's built-in SQLite (`node:sqlite`) instead of
// the native expo module, so repository unit tests run against a real
// SQLite engine under jest (real transactions, real rollbacks).
//
// The adapter implements exactly the `SQLiteDatabase` surface the drizzle
// expo driver touches: `prepareSync(sql)` returning statements with
// `executeSync` / `executeForRawResultSync`. Importing the driver through
// its `driver` subpath keeps `expo-sqlite` (native) out of the test runtime;
// the app's `database.ts` keeps using the full entry.
//
// NEVER import this from app code - it exists for `*.test.ts` files only.

import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite/driver'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import type { LocalDatabase } from '../database'
import { migrations } from '../migrations.generated'
import * as schema from '../schema'

/** The expo-sqlite client subset consumed by drizzle's expo driver. */
function createNodeSqliteClient(raw: DatabaseSync) {
  const statements = new Map<
    string,
    { object: ReturnType<DatabaseSync['prepare']>; arrays: ReturnType<DatabaseSync['prepare']> }
  >()

  const prepare = (source: string) => {
    let pair = statements.get(source)
    if (!pair) {
      const object = raw.prepare(source)
      const arrays = raw.prepare(source)
      arrays.setReturnArrays(true)
      pair = { object, arrays }
      statements.set(source, pair)
    }
    return pair
  }

  const client = {
    prepareSync(source: string) {
      const { object, arrays } = prepare(source)
      return {
        executeSync(params: unknown[]) {
          const result = object.run(...(params as never[]))
          return {
            changes: Number(result.changes),
            lastInsertRowId: Number(result.lastInsertRowid ?? 0),
            getAllSync: () => object.all(...(params as never[])),
            getFirstSync: () => object.get(...(params as never[])) ?? null,
          }
        },
        executeForRawResultSync(params: unknown[]) {
          return { getAllSync: () => arrays.all(...(params as never[])) }
        },
      }
    },
  }
  return client
}

/** Opens an in-memory database with the app schema migrated. */
export async function createTestDatabase(): Promise<LocalDatabase> {
  const raw = new DatabaseSync(':memory:')
  // The adapter implements the driver's runtime surface; the type comes from
  // expo-sqlite and is satisfied structurally only through this cast.
  const client = createNodeSqliteClient(raw) as unknown as Parameters<typeof drizzle>[0]
  const db = drizzle(client, { schema })
  await migrate(db, migrations)
  return db
}
