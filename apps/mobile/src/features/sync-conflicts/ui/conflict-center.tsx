// Conflict resolution UI (spec: "Conflict resolution flows"). Renders nothing
// by default - conflicts surface as dialogs driven by the persistent
// `sync_conflicts` table, so they survive restarts and re-prompt until
// resolved. Edit-vs-edit offers both outcomes ("keep mine" re-pushes on the
// current server version, "take theirs" applies the server state and drops
// the pending operations). Delete-vs-edit notifications carry the
// delete-wins default (already applied by the engine) plus
// restore-as-new-record. No path silently discards local changes.

import { useCallback, useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateAccountPayload,
  CreateCategoryPayload,
  CreateTransactionPayload,
} from '@expense-tracker/api'
import { useAccountRepository } from '@/entities/account/api/repository'
import { useCategoryRepository } from '@/entities/category/api/repository'
import { useTransactionRepository } from '@/entities/transaction/api/repository'
import { useLocalDatabase } from '@/shared/lib/db/database-context'
import {
  getConflictById,
  listUnresolvedConflicts,
  markConflictResolved,
  resolveConflictKeepLocal,
  resolveConflictTakeServer,
  type LocalSyncConflict,
} from '@/shared/lib/sync/conflicts'
import { useSyncController } from '@/shared/lib/sync/sync-provider'
import { getRepositoryErrorText } from '@/shared/lib/data/repository-errors-ru'

const ENTITY_NAMES_RU: Record<LocalSyncConflict['entity'], string> = {
  account: 'Счёт',
  category: 'Категория',
  transaction: 'Транзакция',
}

/** Human label of the conflicting record (name / description). */
function conflictSubject(conflict: LocalSyncConflict): string {
  const state = conflict.localState as Record<string, unknown> | null
  const source =
    state ?? (conflict.serverState?.data as Record<string, unknown> | undefined) ?? undefined
  const name = typeof source?.name === 'string' ? source.name : ''
  const description = typeof source?.description === 'string' ? source.description : ''
  return name || description
}

function asCreateAccountPayload(state: Record<string, unknown>): CreateAccountPayload {
  return {
    name: String(state.name ?? ''),
    currency: (state.currency === 'EUR' || state.currency === 'RUB'
      ? state.currency
      : 'USD') as CreateAccountPayload['currency'],
    openingBalance: Number(state.openingBalance ?? 0),
  }
}

function asCreateCategoryPayload(state: Record<string, unknown>): CreateCategoryPayload {
  return {
    name: String(state.name ?? ''),
    type: state.type === 'income' ? 'income' : 'expense',
    icon: String(state.icon ?? ''),
    color: String(state.color ?? ''),
  }
}

function asCreateTransactionPayload(state: Record<string, unknown>): CreateTransactionPayload {
  const base = {
    amount: Number(state.amount ?? 0),
    description: typeof state.description === 'string' ? state.description : '',
    occurredAt: String(state.occurredAt ?? new Date().toISOString()),
  }
  if (state.type === 'transfer') {
    return {
      ...base,
      type: 'transfer',
      fromAccountId: String(state.fromAccountId),
      toAccountId: String(state.toAccountId),
    }
  }
  return {
    ...base,
    type: state.type === 'income' ? 'income' : 'expense',
    accountId: String(state.accountId),
    categoryId: String(state.categoryId),
  }
}

/**
 * Global conflict host: mounted once in the root layout. Tracks unresolved
 * conflicts, prompts for every new one (and re-prompts after a restart - the
 * prompted set is intentionally in-memory only), and executes resolutions.
 */
export function ConflictCenter() {
  const db = useLocalDatabase()
  const queryClient = useQueryClient()
  const { engine, registerConflictPresenter } = useSyncController()
  const accountRepository = useAccountRepository()
  const categoryRepository = useCategoryRepository()
  const transactionRepository = useTransactionRepository()
  const promptedRef = useRef<Set<string>>(new Set())

  const conflictsQuery = useQuery({
    queryKey: ['sync', 'conflicts'],
    queryFn: async () => listUnresolvedConflicts(db),
  })
  const conflicts = conflictsQuery.data ?? []

  const afterResolution = useCallback(() => {
    void queryClient.invalidateQueries()
    void engine.run()
  }, [engine, queryClient])

  const restoreAsNew = useCallback(
    async (conflict: LocalSyncConflict) => {
      const fresh = await getConflictById(db, conflict.id)
      if (!fresh || typeof fresh.localState !== 'object' || fresh.localState === null) return
      const state = fresh.localState as Record<string, unknown>
      try {
        if (fresh.entity === 'account') {
          const created = await accountRepository.create(asCreateAccountPayload(state))
          // Create cannot carry a manual adjustment (wire contract), so a
          // lost adjustment is replayed as an immediate local update.
          const manualAdjustment = Number(state.manualAdjustment ?? 0)
          if (Number.isSafeInteger(manualAdjustment) && manualAdjustment !== 0) {
            await accountRepository.update(created.id, {
              manualAdjustment,
              version: created.version,
            })
          }
        } else if (fresh.entity === 'category') {
          await categoryRepository.create(asCreateCategoryPayload(state))
        } else {
          await transactionRepository.create(asCreateTransactionPayload(state))
        }
        markConflictResolved(db, fresh.id)
      } catch (error) {
        Alert.alert('Восстановление не удалось', getRepositoryErrorText(error))
        return
      }
      afterResolution()
    },
    [accountRepository, afterResolution, categoryRepository, db, transactionRepository],
  )

  const resolve = useCallback(
    (action: 'keep-local' | 'take-server' | 'dismiss', conflict: LocalSyncConflict) => {
      if (action === 'keep-local') resolveConflictKeepLocal(db, conflict.id)
      else if (action === 'take-server') resolveConflictTakeServer(db, conflict.id)
      else markConflictResolved(db, conflict.id)
      afterResolution()
    },
    [afterResolution, db],
  )

  const prompt = useCallback(
    (conflict: LocalSyncConflict) => {
      const entityName = ENTITY_NAMES_RU[conflict.entity]
      const subject = conflictSubject(conflict)

      if (conflict.kind === 'deleted') {
        Alert.alert(
          'Запись удалена',
          `${entityName}${subject ? ` «${subject}»` : ''} удалён на другом устройстве, '
          + 'поэтому локальное изменение отменено. Его можно восстановить как новую запись.`,
          [
            {
              text: 'Восстановить как новую',
              onPress: () => {
                void restoreAsNew(conflict)
              },
            },
            { text: 'Понятно', onPress: () => resolve('dismiss', conflict) },
          ],
          { cancelable: false },
        )
        return
      }

      Alert.alert(
        'Конфликт изменений',
        `${entityName}${subject ? ` «${subject}»` : ''} изменён на другом устройстве. '
        + 'Выберите, какую версию сохранить.`,
        [
          { text: 'Оставить мою', onPress: () => resolve('keep-local', conflict) },
          { text: 'Принять серверную', onPress: () => resolve('take-server', conflict) },
          { text: 'Позже', style: 'cancel' },
        ],
        { cancelable: true },
      )
    },
    [resolve, restoreAsNew],
  )

  // Prompt for conflicts that appeared since the last look (and for all of
  // them right after a restart - the prompted set never persists). The effect
  // keys on the joined id list: the query result is a fresh array per poll,
  // and re-prompting on an unchanged set would loop. The list itself is read
  // through a ref so the unstable array stays out of the dependency set.
  const conflictsRef = useRef(conflicts)
  conflictsRef.current = conflicts
  const conflictSignature = conflicts.map((conflict) => conflict.id).join(',')
  useEffect(() => {
    for (const conflict of conflictsRef.current) {
      if (promptedRef.current.has(conflict.id)) continue
      promptedRef.current.add(conflict.id)
      prompt(conflict)
    }
  }, [conflictSignature, prompt])

  // The sync badge asks us to re-surface whatever is still unresolved.
  useEffect(() => {
    registerConflictPresenter(() => {
      const next = listUnresolvedConflicts(db).at(0)
      if (next) prompt(next)
    })
    return () => registerConflictPresenter(null)
  }, [db, prompt, registerConflictPresenter])

  return null
}
