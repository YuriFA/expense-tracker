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
export type SyncEntity =
  | 'account'
  | 'category'
  | 'transaction'
  | 'debtor'
  | 'debt_operation'
  | 'planned_payment'

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

export const debtors = sqliteTable('debtors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  note: text('note').notNull().default(''),
  version: integer('version').notNull().default(1),
  serverVersion: integer('server_version').notNull().default(0),
  deletedAt: text('deleted_at'),
  createdAt: text('created_at').notNull(),
})

export const debtOperations = sqliteTable(
  'debt_operations',
  {
    id: text('id').primaryKey(),
    debtorId: text('debtor_id').notNull(),
    /** DebtDirection ('receivable' | 'payable'). */
    direction: text('direction').notNull(),
    /** DebtOperationKind ('debt' | 'repayment'). */
    kind: text('kind').notNull(),
    /** Integer minor units, always >= 1. */
    amount: integer('amount').notNull(),
    note: text('note').notNull().default(''),
    /** Canonical UTC ISO-8601 (`new Date(...).toISOString()`). */
    occurredAt: text('occurred_at').notNull(),
    version: integer('version').notNull().default(1),
    serverVersion: integer('server_version').notNull().default(0),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_debt_operations_debtor_id').on(table.debtorId),
    index('idx_debt_operations_occurred_at').on(table.occurredAt),
  ],
)

export const plannedPayments = sqliteTable(
  'planned_payments',
  {
    id: text('id').primaryKey(),
    /** PlannedPaymentType ('expense' | 'income'); immutable after create. */
    type: text('type').notNull(),
    /** Integer minor units, always >= 1. */
    amount: integer('amount').notNull(),
    /** Optional name (never unique); '' = unnamed. */
    name: text('name').notNull().default(''),
    accountId: text('account_id').notNull(),
    categoryId: text('category_id').notNull(),
    /** Calendar day (`YYYY-MM-DD`) of the next occurrence; past dates are legal. */
    nextDue: text('next_due').notNull(),
    /** Series anchor (`YYYY-MM-DD`): short months clamp to it and recover. */
    anchorDate: text('anchor_date').notNull(),
    /** PlannedPaymentRegularity ('daily' | 'weekly' | 'monthly' | 'yearly'). */
    regularity: text('regularity').notNull(),
    /** PlannedPaymentConfirmMode ('manual' | 'auto'). */
    confirmMode: text('confirm_mode').notNull(),
    /** PlannedPaymentReminder ('off' | 'day_before' | 'on_day'). */
    reminder: text('reminder').notNull(),
    note: text('note').notNull().default(''),
    version: integer('version').notNull().default(1),
    serverVersion: integer('server_version').notNull().default(0),
    deletedAt: text('deleted_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_planned_payments_next_due').on(table.nextDue),
    index('idx_planned_payments_account_id').on(table.accountId),
    index('idx_planned_payments_category_id').on(table.categoryId),
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
export type DebtorRow = typeof debtors.$inferSelect
export type DebtOperationRow = typeof debtOperations.$inferSelect
export type PlannedPaymentRow = typeof plannedPayments.$inferSelect
export type SyncOutboxRow = typeof syncOutbox.$inferSelect
export type SyncConflictRow = typeof syncConflicts.$inferSelect
