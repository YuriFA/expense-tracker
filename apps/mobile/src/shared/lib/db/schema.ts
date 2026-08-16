// Local SQLite schema (source of truth for the mobile app). Mirrors the domain
// plus the sync columns: every entity carries `version` (local logical
// revision, the CAS token) and `serverVersion` (last server-confirmed
// revision, 0 = never published); CLEAN ⟺ version == server_version.
//
// Invariants (root AGENTS.md + change design D10): money is INTEGER minor
// units, timestamps are ISO-8601 UTC TEXT, ids are client-generated UUID v4.
// Deletes are tombstones (`deletedAt`); listings never return tombstones.

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Syncable entity kinds stored in the outbox / conflict tables. */
export type SyncEntity = 'account' | 'category' | 'transaction'

/** Operation kind of a pending sync operation (spec: upsert or delete). */
export type SyncOperationKind = 'upsert' | 'delete'

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** CurrencyCode ('USD' | 'EUR' | 'RUB'). */
  currency: text('currency').notNull(),
  /** Integer minor units. */
  openingBalance: integer('opening_balance').notNull(),
  manualAdjustment: integer('manual_adjustment').notNull().default(0),
  version: integer('version').notNull().default(1),
  serverVersion: integer('server_version').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** CategoryType ('income' | 'expense'). */
  type: text('type').notNull(),
  icon: text('icon').notNull(),
  /** Hex color from the predefined palette. */
  color: text('color').notNull(),
  /** Present only for bundled default categories; null for user-created. */
  slug: text('slug'),
  version: integer('version').notNull().default(1),
  serverVersion: integer('server_version').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
})

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    /** TransactionType ('income' | 'expense' | 'transfer'). */
    type: text('type').notNull(),
    /** Integer minor units, always >= 1. */
    amount: integer('amount').notNull(),
    description: text('description').notNull().default(''),
    /** Canonical UTC ISO-8601 (`new Date(...).toISOString()`). */
    occurredAt: text('occurred_at').notNull(),
    updatedAt: text('updated_at'),
    // Cashflow (income/expense) references; NULL for transfers.
    accountId: text('account_id'),
    categoryId: text('category_id'),
    // Transfer references; NULL for cashflow.
    fromAccountId: text('from_account_id'),
    toAccountId: text('to_account_id'),
    version: integer('version').notNull().default(1),
    serverVersion: integer('server_version').notNull().default(0),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_transactions_occurred_at').on(table.occurredAt),
    index('idx_transactions_account_id').on(table.accountId),
    index('idx_transactions_category_id').on(table.categoryId),
    index('idx_transactions_type_occurred_at').on(table.type, table.occurredAt),
  ],
)

// --- Sync plumbing (exists from day one so the sync engine plugs in without
// schema changes; see design D6, D8, D9) ------------------------------------

/**
 * Persistent outbox: one row per local mutation, written in the same
 * transaction as the entity change. `baseVersion` is frozen at creation
 * (= `serverVersion` when the op is created, never the local `version`);
 * `sentAt` freezes an operation so retries reuse the same opId and payload.
 */
export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    opId: text('op_id').primaryKey(),
    entity: text('entity').notNull().$type<SyncEntity>(),
    entityId: text('entity_id').notNull(),
    op: text('op').notNull().$type<SyncOperationKind>(),
    /** JSON-encoded full record payload; 'null' for delete ops. */
    payloadJson: text('payload_json').notNull(),
    baseVersion: integer('base_version').notNull(),
    createdAt: text('created_at').notNull(),
    sentAt: text('sent_at'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [index('idx_sync_outbox_entity').on(table.entity, table.entityId)],
)

/** Persistent conflict records (push 409s, pull-newer-on-dirty). Phase 3 UI. */
export const syncConflicts = sqliteTable('sync_conflicts', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull().$type<SyncEntity>(),
  entityId: text('entity_id').notNull(),
  opId: text('op_id'),
  kind: text('kind').notNull(),
  baseVersion: integer('base_version').notNull(),
  serverVersion: integer('server_version').notNull(),
  localStateJson: text('local_state_json').notNull(),
  serverStateJson: text('server_state_json').notNull(),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
})

/** Key/value sync metadata: `owner_user_id`, `pull_cursor`, `device_id`. */
export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type AccountRow = typeof accounts.$inferSelect
export type CategoryRow = typeof categories.$inferSelect
export type TransactionRow = typeof transactions.$inferSelect
export type SyncOutboxRow = typeof syncOutbox.$inferSelect
export type SyncConflictRow = typeof syncConflicts.$inferSelect
