// Conflict center tests: unresolved conflicts surface as dialogs (edit-vs-
// edit with both outcomes; delete notification with restore-as-new), and the
// button handlers drive the shared resolution store plus a sync kick.

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { render, waitFor, act } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTestDatabase } from '@expense-tracker/local-data/testing'
import { DatabaseProvider } from '@/shared/lib/db/database-context'
import type { LocalDatabase } from '@/shared/lib/db/database'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { AccountRepositoryProvider } from '@/entities/account'
import { createLocalAccountRepository } from '@/entities/account'
import { CategoryRepositoryProvider } from '@/entities/category'
import { createLocalCategoryRepository } from '@/entities/category'
import { TransactionRepositoryProvider } from '@/entities/transaction'
import { createLocalTransactionRepository } from '@/entities/transaction'
import { DebtRepositoryProvider } from '@/entities/debt'
import { createLocalDebtOperationRepository, createLocalDebtorRepository } from '@/entities/debt'
import { PlannedPaymentRepositoryProvider } from '@/entities/planned-payment'
import { createLocalPlannedPaymentRepository } from '@/entities/planned-payment'
import {
  categories,
  syncOutbox,
  listUnresolvedConflicts,
  recordConflict,
} from '@expense-tracker/local-data'
import { eq } from 'drizzle-orm'
import { ConflictCenter } from './conflict-center'

// Mock variables must carry the `mock` prefix to be referenceable from the
// hoisted jest.mock factory.
const mockEngineRun = jest.fn(() =>
  Promise.resolve({ status: 'completed', pushed: 0, pulled: 0, conflicts: 0 }),
)
const mockRegisterPresenter = jest.fn()

jest.mock('@/shared/lib/sync/sync-context', () => ({
  useSyncController: () => ({
    engine: {
      run: mockEngineRun,
      resume: jest.fn(),
      getState: () => ({ running: false, paused: false, lastRunAt: null }),
      subscribe: () => () => undefined,
    },
    engineState: { running: false, paused: false, lastRunAt: null },
    runNow: jest.fn(),
    presentConflicts: jest.fn(),
    registerConflictPresenter: mockRegisterPresenter,
  }),
}))

let db: LocalDatabase
let alertButtons: { text: string; onPress?: () => void }[]
let alertTitle: string

beforeEach(async () => {
  jest.clearAllMocks()
  db = await createTestDatabase()
  alertButtons = []
  alertTitle = ''
  jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
    alertTitle = title
    alertButtons = (buttons ?? []) as typeof alertButtons
    return
  })
})

function renderCenter() {
  const queryClient = createQueryClient()
  const element = (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider database={db}>
        <AccountRepositoryProvider repository={createLocalAccountRepository(db)}>
          <CategoryRepositoryProvider repository={createLocalCategoryRepository(db)}>
            <TransactionRepositoryProvider repository={createLocalTransactionRepository(db)}>
              <DebtRepositoryProvider
                debtorRepository={createLocalDebtorRepository(db)}
                debtOperationRepository={createLocalDebtOperationRepository(db)}
              >
                <PlannedPaymentRepositoryProvider
                  repository={createLocalPlannedPaymentRepository(db)}
                >
                  <ConflictCenter />
                </PlannedPaymentRepositoryProvider>
              </DebtRepositoryProvider>
            </TransactionRepositoryProvider>
          </CategoryRepositoryProvider>
        </AccountRepositoryProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  )
  const utils = render(element)
  return {
    ...utils,
    rerenderCenter() {
      utils.rerender(element)
    },
  }
}

/** A dirty category row (the conflict's local side). `tombstone` mirrors the
 * engine's delete-wins state for deleted-kind conflicts. */
async function seedDirtyCategory(name: string, tombstone = false) {
  const repo = createLocalCategoryRepository(db)
  const created = await repo.create({ name, type: 'expense', icon: 'car', color: '#7c5cff' })
  if (tombstone) {
    db.update(categories)
      .set({ deletedAt: new Date().toISOString(), version: 2, serverVersion: 2 })
      .where(eq(categories.id, created.id))
      .run()
    db.delete(syncOutbox).run()
  }
  return created
}

function recordVersionConflict(entityId: string, serverName: string) {
  db.transaction((tx) =>
    recordConflict(tx, {
      entity: 'category',
      entityId,
      opId: null,
      kind: 'version',
      baseVersion: 1,
      serverVersion: 2,
      localState: {
        id: entityId,
        name: 'Локальное имя',
        type: 'expense',
        icon: 'car',
        color: '#7c5cff',
      },
      serverState: {
        version: 2,
        deleted: false,
        data: { name: serverName, type: 'expense', icon: 'car', color: '#7c5cff' },
      },
    }),
  )
}

describe('ConflictCenter', () => {
  it('prompts an edit-vs-edit dialog with both outcomes and registers as presenter', async () => {
    const category = await seedDirtyCategory('Локальное имя')
    recordVersionConflict(category.id, 'Серверное имя')
    renderCenter()

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect(alertTitle).toBe('Конфликт изменений')
    const labels = alertButtons.map((b) => b.text)
    expect(labels).toEqual(['Оставить мою', 'Принять серверную', 'Позже'])
    expect(mockRegisterPresenter).toHaveBeenCalled()
  })

  it('keep-mine rebases and re-enqueues an operation', async () => {
    const category = await seedDirtyCategory('Локальное имя')
    recordVersionConflict(category.id, 'Серверное имя')
    renderCenter()
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))

    await act(async () => {
      alertButtons.find((b) => b.text === 'Оставить мою')?.onPress?.()
    })

    await waitFor(() => expect(listUnresolvedConflicts(db)).toHaveLength(0))
    const ops = db.select().from(syncOutbox).all()
    expect(ops.at(-1)?.baseVersion).toBe(2)
    expect(mockEngineRun).toHaveBeenCalled()
  })

  it('take-theirs applies the server state and drops operations', async () => {
    const category = await seedDirtyCategory('Локальное имя')
    recordVersionConflict(category.id, 'Серверное имя')
    renderCenter()
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))

    await act(async () => {
      alertButtons.find((b) => b.text === 'Принять серверную')?.onPress?.()
    })

    await waitFor(() => expect(listUnresolvedConflicts(db)).toHaveLength(0))
    const row = db.select().from(categories).where(eq(categories.id, category.id)).get()
    expect(row?.name).toBe('Серверное имя')
    expect(row).toMatchObject({ version: 2, serverVersion: 2 })
    expect(db.select().from(syncOutbox).all()).toHaveLength(0)
  })

  it('delete notification offers restore-as-new with the preserved edit', async () => {
    const category = await seedDirtyCategory('Утраченная правка', true)
    db.transaction((tx) =>
      recordConflict(tx, {
        entity: 'category',
        entityId: category.id,
        opId: null,
        kind: 'deleted',
        baseVersion: 1,
        serverVersion: 2,
        localState: {
          id: category.id,
          name: 'Утраченная правка',
          type: 'expense',
          icon: 'car',
          color: '#7c5cff',
        },
        serverState: { version: 2, deleted: true },
      }),
    )
    renderCenter()
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))
    expect(alertTitle).toBe('Запись удалена')

    await act(async () => {
      alertButtons.find((b) => b.text === 'Восстановить как новую')?.onPress?.()
    })

    await waitFor(() => expect(listUnresolvedConflicts(db)).toHaveLength(0))
    const rows = db.select().from(categories).where(eq(categories.name, 'Утраченная правка')).all()
    expect(rows).toHaveLength(2) // tombstone + restored copy
    const restored = rows.find((r) => r.deletedAt === null)
    expect(restored?.id).not.toBe(category.id)
    const ops = db.select().from(syncOutbox).all()
    expect(ops.some((op) => op.entityId === restored?.id)).toBe(true)
  })

  it('dismiss resolves the notification without restoring', async () => {
    const category = await seedDirtyCategory('Утраченная правка', true)
    db.transaction((tx) =>
      recordConflict(tx, {
        entity: 'category',
        entityId: category.id,
        opId: null,
        kind: 'deleted',
        baseVersion: 1,
        serverVersion: 2,
        localState: {
          id: category.id,
          name: 'Утраченная правка',
          type: 'expense',
          icon: 'car',
          color: '#7c5cff',
        },
        serverState: { version: 2, deleted: true },
      }),
    )
    renderCenter()
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1))

    await act(async () => {
      alertButtons.find((b) => b.text === 'Понятно')?.onPress?.()
    })

    await waitFor(() => expect(listUnresolvedConflicts(db)).toHaveLength(0))
    const remaining = db.select().from(categories).all()
    expect(remaining).toHaveLength(1) // only the tombstone
    expect(remaining[0]?.deletedAt).not.toBeNull()
  })
})
