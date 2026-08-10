import * as SQLite from 'expo-sqlite'
import { DEFAULT_CATEGORIES, messages, type AppLocale } from '@expense-tracker/i18n'
import { DEFAULT_CURRENCY, type CurrencyCode } from '@expense-tracker/money'
import { generateId } from '@expense-tracker/api'
import { DATABASE_NAME, STORAGE_KEYS } from '@shared/config/storage-keys'
import { settingsStorage } from '@shared/services/storage'
import type { Settings } from '@shared/config/settings'

/**
 * Local persistence for the relational domain (accounts / categories /
 * transactions).
 *
 * Persistence choice rationale (design.md section 10): SQLite is the
 * recommended store for relational, referential data on RN. It gives us real
 * referential integrity, queryable filters + cursor pagination for the
 * Transactions list (a genuine win as history grows), and durable, atomic
 * writes that survive restarts - the offline-first contract. Settings stay in
 * MMKV (`services/storage`); the HTTP repository impls from
 * `@expense-tracker/api` remain the swappable DI alternative.
 *
 * Domain rows are mapped to/from the shared domain types at the repository
 * layer; balances are computed with the shared integer money calculator. This
 * module owns only SQL.
 */
export type Database = SQLite.SQLiteDatabase

let dbInstance: Database | null = null

const SCHEMA = /* sql */ `
CREATE TABLE IF NOT EXISTS accounts (
  id                TEXT PRIMARY KEY NOT NULL,
  name              TEXT NOT NULL,
  currency          TEXT NOT NULL,
  opening_balance   INTEGER NOT NULL DEFAULT 0,
  manual_adjustment INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id    TEXT PRIMARY KEY NOT NULL,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon  TEXT NOT NULL,
  color TEXT NOT NULL,
  slug  TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id              TEXT PRIMARY KEY NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount          INTEGER NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  occurred_at     TEXT NOT NULL,
  updated_at      TEXT,
  version         INTEGER NOT NULL DEFAULT 1,
  account_id      TEXT,
  category_id     TEXT,
  from_account_id TEXT,
  to_account_id   TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at
  ON transactions (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account
  ON transactions (account_id, from_account_id, to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions (category_id);
`

/**
 * Opens (or returns the cached) database, applies the schema idempotently, and
 * seeds the bundled default categories on first run. Safe to call repeatedly.
 */
export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance
  }

  const db = await SQLite.openDatabaseAsync(DATABASE_NAME)
  await db.execAsync('PRAGMA journal_mode = WAL;')
  await db.execAsync('PRAGMA foreign_keys = ON;')
  await db.execAsync(SCHEMA)
  await seedDefaultCategories(db)
  await seedDefaultAccount(db)

  dbInstance = db
  return db
}

/**
 * Seeds the localized-by-slug starter category set when the table is empty.
 * Names are stored English (the seed fallback); display names localize via
 * `mapCategories` + the i18n translator at read time.
 */
async function seedDefaultCategories(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM categories')
  if (row && row.c > 0) {
    return
  }

  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        /* sql */ `INSERT INTO categories (id, name, type, icon, color, slug)
                   VALUES (?, ?, ?, ?, ?, ?)`,
        category.id,
        category.name,
        category.type,
        category.icon,
        category.color,
        category.slug ?? null,
      )
    }
  })
}

/**
 * Seeds a single starter account in the user's default currency when the table
 * is empty. The Home input screen requires at least one account to record a
 * transaction against, so this guarantees "open -> type" works on first launch
 * without a blocking onboarding flow (design section 3). Account CRUD lives in
 * the Accounts screen; this is a one-time convenience seed.
 */
async function seedDefaultAccount(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM accounts')
  if (row && row.c > 0) {
    return
  }

  const settings = settingsStorage.get<Settings>(STORAGE_KEYS.settings)
  const currency: CurrencyCode = settings?.currency ?? DEFAULT_CURRENCY
  const locale: AppLocale = settings?.locale === 'ru' ? 'ru' : 'en'
  const name = messages[locale].accounts.starterAccountName

  await db.runAsync(
    /* sql */ `INSERT INTO accounts (id, name, currency, opening_balance, manual_adjustment)
               VALUES (?, ?, ?, 0, 0)`,
    generateId(),
    name,
    currency,
  )
}
