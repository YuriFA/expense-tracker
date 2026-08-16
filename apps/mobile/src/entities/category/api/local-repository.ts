// Local (offline-first) CategoryRepository over the app's SQLite database.
//
// Every mutation writes the entity row AND a pending sync operation in one
// transaction; `version` bumps by exactly 1 per mutation while
// `serverVersion` stays untouched (design D5), so the record is DIRTY until
// the future sync engine confirms it. Domain rules mirror the backend:
// per-user unique names, tombstone deletes with an in-use guard, and the
// shared machine-readable error codes.

import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  AlreadyExistsError,
  InvalidPayloadError,
  NotFoundError,
  ReferentialIntegrityError,
  VersionConflictError,
  type Category,
  type CategoryRepository,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@expense-tracker/api'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { enqueueOperation, hasSentOperations, removeOperationsFor } from '@/shared/lib/db/outbox'
import { categories, transactions, type CategoryRow } from '@/shared/lib/db/schema'
import { generateId } from '@/shared/lib/generate-id'

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Category['type'],
    icon: row.icon,
    color: row.color,
    version: row.version,
    ...(row.slug ? { slug: row.slug } : {}),
  }
}

function isCategoryType(value: string): value is Category['type'] {
  return value === 'income' || value === 'expense'
}

type LocalTx = Parameters<Parameters<LocalDatabase['transaction']>[0]>[0]

/** A non-deleted category with this name exists (excluding `exceptId`). */
function hasDuplicateName(tx: LocalTx, name: string, exceptId?: string): boolean {
  const rows = tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, name), isNull(categories.deletedAt)))
    .all()
  return rows.some((row) => row.id !== exceptId)
}

export function createLocalCategoryRepository(db: LocalDatabase): CategoryRepository {
  return {
    async getAll() {
      const rows = db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt))
        .orderBy(asc(categories.createdAt), asc(categories.id))
        .all()
      return rows.map(toCategory)
    },

    async getById(id: string) {
      const row = db
        .select()
        .from(categories)
        .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
        .get()
      return row ? toCategory(row) : null
    },

    async create(payload: CreateCategoryPayload) {
      const name = payload.name?.trim() ?? ''
      if (!name) throw new InvalidPayloadError('Category name is required')
      if (!isCategoryType(payload.type)) throw new InvalidPayloadError('Invalid category type')
      if (!payload.icon) throw new InvalidPayloadError('Category icon is required')
      if (!payload.color) throw new InvalidPayloadError('Category color is required')

      const id = payload.id ?? generateId()

      return db.transaction((tx) => {
        const duplicateName = hasDuplicateName(tx, name)
        if (duplicateName) {
          throw new AlreadyExistsError('Category already exists', {
            apiCode: 'CATEGORY_ALREADY_EXISTS',
          })
        }
        if (tx.select({ id: categories.id }).from(categories).where(eq(categories.id, id)).get()) {
          throw new AlreadyExistsError('Category already exists', {
            apiCode: 'CATEGORY_ALREADY_EXISTS',
          })
        }

        const row: CategoryRow = {
          id,
          name,
          type: payload.type,
          icon: payload.icon,
          color: payload.color,
          slug: payload.slug ?? null,
          version: 1,
          serverVersion: 0,
          deletedAt: null,
          createdAt: new Date().toISOString(),
        }
        tx.insert(categories).values(row).run()
        enqueueOperation(tx, {
          entity: 'category',
          entityId: id,
          op: 'upsert',
          payload: toCategory(row),
          baseVersion: row.serverVersion,
        })
        return toCategory(row)
      })
    },

    async update(id: string, payload: UpdateCategoryPayload) {
      const hasFields =
        payload.name !== undefined ||
        payload.type !== undefined ||
        payload.icon !== undefined ||
        payload.color !== undefined
      if (!hasFields) throw new InvalidPayloadError('No fields to update')
      if (payload.name !== undefined && !payload.name.trim()) {
        throw new InvalidPayloadError('Category name is required')
      }
      if (payload.type !== undefined && !isCategoryType(payload.type)) {
        throw new InvalidPayloadError('Invalid category type')
      }

      return db.transaction((tx) => {
        const row = tx.select().from(categories).where(eq(categories.id, id)).get()
        if (!row || row.deletedAt) throw new NotFoundError('Category not found')

        // Optimistic concurrency: PATCH carries the version the caller read.
        if (payload.version !== row.version) {
          throw new VersionConflictError('Category was modified concurrently', {
            apiCode: 'CATEGORY_VERSION_CONFLICT',
          })
        }

        const name = payload.name !== undefined ? payload.name.trim() : row.name
        if (name !== row.name && hasDuplicateName(tx, name, id)) {
          throw new AlreadyExistsError('Category already exists', {
            apiCode: 'CATEGORY_ALREADY_EXISTS',
          })
        }

        const next: CategoryRow = {
          ...row,
          name,
          type: payload.type ?? row.type,
          icon: payload.icon ?? row.icon,
          color: payload.color ?? row.color,
          version: row.version + 1,
        }
        tx.update(categories).set(next).where(eq(categories.id, id)).run()
        enqueueOperation(tx, {
          entity: 'category',
          entityId: id,
          op: 'upsert',
          payload: toCategory(next),
          baseVersion: row.serverVersion,
        })
        return toCategory(next)
      })
    },

    async remove(id: string) {
      db.transaction((tx) => {
        const row = tx.select().from(categories).where(eq(categories.id, id)).get()
        if (!row || row.deletedAt) throw new NotFoundError('Category not found')

        const referenced = tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)))
          .get()
        if (referenced) {
          throw new ReferentialIntegrityError('Category has referencing transactions', {
            apiCode: 'CATEGORY_IN_USE',
          })
        }

        if (row.serverVersion === 0 && !hasSentOperations(tx, 'category', id)) {
          // Unborn record (no operation ever left the device): it vanishes
          // and its queued operations go with it - nothing is ever pushed.
          tx.delete(categories).where(eq(categories.id, id)).run()
          removeOperationsFor(tx, 'category', id)
        } else {
          // serverVersion 0 with a SENT create means the server may already
          // hold the record (in flight / lost response): the delete must
          // travel as a tombstone after the create, never be wiped.
          const next = { ...row, deletedAt: new Date().toISOString(), version: row.version + 1 }
          tx.update(categories).set(next).where(eq(categories.id, id)).run()
          enqueueOperation(tx, {
            entity: 'category',
            entityId: id,
            op: 'delete',
            payload: null,
            baseVersion: row.serverVersion,
          })
        }
      })
    },
  }
}
