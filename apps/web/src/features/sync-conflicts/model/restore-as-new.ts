import { useMutation, useQueryCache } from '@pinia/colada'
import type {
  CreateDebtorPayload,
  CreateDebtOperationPayload,
  CreateTransactionPayload,
  Transaction,
} from '@expense-tracker/api'
import type {
  ConfirmPlannedPaymentInput,
  LocalSyncConflict,
} from '@expense-tracker/local-data'
import { getLocalDbApi, useSyncController } from '@/shared/lib/local-db'
import { useAccountRepository } from '@/entities/account'
import { useCategoryRepository } from '@/entities/category'
import { useTransactionRepository } from '@/entities/transaction'
import { useDebtorRepository } from '@/entities/debtor'
import { useDebtOperationRepository } from '@/entities/debt-operation'
import { usePlannedPaymentRepository } from '@/entities/planned-payment'

// Restore-as-new (web-screens-parity design D7, satisfying the sync-protocol
// SHALL): a delete-vs-edit conflict preserves the lost edit in `localState`;
// restoring re-creates it as a FRESH record (new client UUID via the
// repository's id factory) and marks the conflict resolved. Pure UI over
// already-stored data - no engine changes. Referenced records (account,
// category, debtor) may themselves be gone; that surfaces as the repository's
// typed unknown-references error.

interface RestoreRepositories {
  accounts: ReturnType<typeof useAccountRepository>
  categories: ReturnType<typeof useCategoryRepository>
  transactions: ReturnType<typeof useTransactionRepository>
  debtors: ReturnType<typeof useDebtorRepository>
  debtOperations: ReturnType<typeof useDebtOperationRepository>
  plannedPayments: ReturnType<typeof usePlannedPaymentRepository> & {
    confirmPlannedPayment(input: ConfirmPlannedPaymentInput): Promise<void>
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/** True when the preserved local state carries the fields a re-create needs. */
export function canRestoreAsNew(conflict: LocalSyncConflict): boolean {
  return typeof conflict.localState === 'object' && conflict.localState !== null
}

async function restoreConflictAsNew(
  conflict: LocalSyncConflict,
  repos: RestoreRepositories,
): Promise<void> {
  const state = conflict.localState as Record<string, unknown> | null
  if (!state) {
    throw new Error('The conflict record carries no preserved local state to restore.')
  }

  switch (conflict.entity) {
    case 'account': {
      const name = asString(state.name)
      const currency = asString(state.currency)
      if (!name || !currency) throw new Error('Incomplete account state.')
      await repos.accounts.create({
        name,
        currency: currency as never,
        openingBalance: asNumber(state.openingBalance) ?? 0,
      })
      break
    }
    case 'category': {
      const name = asString(state.name)
      const type = asString(state.type)
      const icon = asString(state.icon)
      const color = asString(state.color)
      if (!name || (type !== 'income' && type !== 'expense') || !icon || !color) {
        throw new Error('Incomplete category state.')
      }
      await repos.categories.create({ name, type, icon, color })
      break
    }
    case 'transaction': {
      const type = asString(state.type)
      const amount = asNumber(state.amount)
      const occurredAt = asString(state.occurredAt)
      if (
        (type !== 'expense' &&
          type !== 'income' &&
          type !== 'transfer' &&
          type !== 'adjustment') ||
        amount === null ||
        !occurredAt
      ) {
        throw new Error('Incomplete transaction state.')
      }
      const payload: Record<string, unknown> = {
        type,
        amount,
        description: asString(state.description) ?? '',
        occurredAt,
      }
      if (type === 'transfer') {
        const fromAccountId = asString(state.fromAccountId)
        const toAccountId = asString(state.toAccountId)
        if (!fromAccountId || !toAccountId) throw new Error('Incomplete transfer state.')
        payload.fromAccountId = fromAccountId
        payload.toAccountId = toAccountId
      } else if (type === 'adjustment') {
        const accountId = asString(state.accountId)
        if (!accountId) throw new Error('Incomplete adjustment state.')
        payload.accountId = accountId
      } else {
        const accountId = asString(state.accountId)
        const categoryId = asString(state.categoryId)
        if (!accountId || !categoryId) throw new Error('Incomplete transaction state.')
        payload.accountId = accountId
        payload.categoryId = categoryId
      }
      await repos.transactions.create(payload as CreateTransactionPayload<Transaction>)
      break
    }
    case 'debtor': {
      const name = asString(state.name)
      if (!name) throw new Error('Incomplete debtor state.')
      const payload: CreateDebtorPayload = { name }
      const note = asString(state.note)
      if (note !== null) payload.note = note
      await repos.debtors.create(payload)
      break
    }
    case 'debt_operation': {
      const debtorId = asString(state.debtorId)
      const direction = asString(state.direction)
      const kind = asString(state.kind)
      const amount = asNumber(state.amount)
      const occurredAt = asString(state.occurredAt)
      if (
        !debtorId ||
        (direction !== 'receivable' && direction !== 'payable') ||
        (kind !== 'debt' && kind !== 'repayment') ||
        amount === null ||
        !occurredAt
      ) {
        throw new Error('Incomplete debt operation state.')
      }
      const payload: CreateDebtOperationPayload = {
        debtorId,
        direction,
        kind,
        amount,
        occurredAt,
      }
      const note = asString(state.note)
      if (note !== null) payload.note = note
      await repos.debtOperations.create(payload)
      break
    }
    case 'planned_payment': {
      const type = asString(state.type)
      const amount = asNumber(state.amount)
      const accountId = asString(state.accountId)
      const categoryId = asString(state.categoryId)
      const nextDue = asString(state.nextDue)
      const regularity = asString(state.regularity)
      const confirmMode = asString(state.confirmMode)
      const reminder = asString(state.reminder)
      if (
        (type !== 'expense' && type !== 'income') ||
        amount === null ||
        !accountId ||
        !categoryId ||
        !nextDue ||
        !['daily', 'weekly', 'monthly', 'yearly'].includes(regularity ?? '') ||
        !['manual', 'auto'].includes(confirmMode ?? '') ||
        !['off', 'day_before', 'on_day'].includes(reminder ?? '')
      ) {
        throw new Error('Incomplete planned payment state.')
      }
      // The new record's anchor is its own nextDue (create-time rule); the
      // preserved anchor dies with the deleted record.
      await repos.plannedPayments.create({
        type,
        amount,
        accountId,
        categoryId,
        nextDue,
        regularity: regularity as never,
        confirmMode: confirmMode as never,
        reminder: reminder as never,
        ...(asString(state.name) !== null ? { name: asString(state.name)! } : {}),
        ...(asString(state.note) !== null ? { note: asString(state.note)! } : {}),
      })
      break
    }
  }

  const api = await getLocalDbApi()
  await api.sync.markConflictResolved(conflict.id)
}

/** Mutation-wrapped restore with the DI repositories and cache refresh. */
export function useRestoreConflictAsNew() {
  const queryCache = useQueryCache()
  const { runNow } = useSyncController()
  const accounts = useAccountRepository()
  const categories = useCategoryRepository()
  const transactions = useTransactionRepository()
  const debtors = useDebtorRepository()
  const debtOperations = useDebtOperationRepository()
  const plannedPayments = usePlannedPaymentRepository()

  return useMutation({
    mutation: (conflict: LocalSyncConflict) =>
      restoreConflictAsNew(conflict, {
        accounts,
        categories,
        transactions,
        debtors,
        debtOperations,
        plannedPayments,
      }),
    onSettled: () => {
      void queryCache.invalidateQueries()
      runNow()
    },
  })
}
