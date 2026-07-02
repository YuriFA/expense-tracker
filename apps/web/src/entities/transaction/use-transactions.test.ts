import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { CashflowTransaction, Transaction, TransferTransaction } from './types'
import {
  useTransactions,
  useTransaction,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from './use-transactions'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const incomeTransaction: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-01T00:00:00Z',
  accountId: 'a1',
  categoryId: 'c1',
} as never

const transferTransaction: TransferTransaction = {
  id: 't2',
  type: 'transfer',
  amount: 50,
  description: '',
  occurredAt: '2024-01-02T00:00:00Z',
  fromAccountId: 'a1',
  toAccountId: 'a2',
} as never

function mountWithComposable<T>(
  composable: () => T,
  options: Parameters<typeof mountWithProviders>[1] = {},
): { result: T } {
  let result!: T
  const TestComponent = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  mountWithProviders(TestComponent, options)
  return { result }
}

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls repository.query on mount with options', async () => {
    const repo = createMockTransactionRepository()
    repo.query.mockResolvedValue([incomeTransaction])
    const { result } = mountWithComposable(() => useTransactions({ type: 'income' }), {
      repositories: { transactions: repo },
    })
    await flushPromises()
    expect(repo.query).toHaveBeenCalledWith({ type: 'income' })
    expect(result.data.value).toEqual([incomeTransaction])
  })

  it('calls repository.query with default empty options when none provided', async () => {
    const repo = createMockTransactionRepository()
    repo.query.mockResolvedValue([])
    mountWithComposable(() => useTransactions(), {
      repositories: { transactions: repo },
    })
    await flushPromises()
    expect(repo.query).toHaveBeenCalledWith({})
  })

  it('exposes loading state initially', () => {
    const repo = createMockTransactionRepository()
    repo.query.mockReturnValue(new Promise<Transaction[]>(() => {}))
    const { result } = mountWithComposable(() => useTransactions(), {
      repositories: { transactions: repo },
    })
    expect(result.isLoading.value).toBe(true)
  })
})

describe('useTransaction', () => {
  it('disables query when id is undefined', () => {
    const repo = createMockTransactionRepository()
    const { result } = mountWithComposable(() => useTransaction(() => undefined), {
      repositories: { transactions: repo },
    })
    expect(repo.getById).not.toHaveBeenCalled()
    expect(result.isLoading.value).toBe(false)
  })

  it('fetches when id is provided', async () => {
    const repo = createMockTransactionRepository()
    repo.getById.mockResolvedValue(incomeTransaction)
    mountWithComposable(() => useTransaction(() => 't1'), {
      repositories: { transactions: repo },
    })
    await flushPromises()
    expect(repo.getById).toHaveBeenCalledWith('t1')
  })
})

describe('useCreateTransaction', () => {
  it('calls repository.create on mutate (cashflow)', async () => {
    const repo = createMockTransactionRepository()
    repo.create.mockResolvedValue(incomeTransaction)
    const { result } = mountWithComposable(() => useCreateTransaction<CashflowTransaction>(), {
      repositories: { transactions: repo },
    })
    const payload = {
      type: 'income' as const,
      amount: 100,
      description: '',
      occurredAt: '2024-01-01T00:00:00Z',
      accountId: 'a1',
      categoryId: 'c1',
    }
    await result.mutateAsync(payload)
    expect(repo.create).toHaveBeenCalledWith(payload)
  })

  it('calls repository.create on mutate (transfer)', async () => {
    const repo = createMockTransactionRepository()
    repo.create.mockResolvedValue(transferTransaction)
    const { result } = mountWithComposable(() => useCreateTransaction<TransferTransaction>(), {
      repositories: { transactions: repo },
    })
    const payload = {
      type: 'transfer' as const,
      amount: 50,
      description: '',
      occurredAt: '2024-01-02T00:00:00Z',
      fromAccountId: 'a1',
      toAccountId: 'a2',
    }
    await result.mutateAsync(payload)
    expect(repo.create).toHaveBeenCalledWith(payload)
  })
})

describe('useUpdateTransaction', () => {
  it('calls repository.update on mutate', async () => {
    const repo = createMockTransactionRepository()
    repo.update.mockResolvedValue(incomeTransaction)
    const { result } = mountWithComposable(() => useUpdateTransaction(), {
      repositories: { transactions: repo },
    })
    const payload = { amount: 200 }
    await result.mutateAsync({ id: 't1', payload })
    expect(repo.update).toHaveBeenCalledWith('t1', payload)
  })
})

describe('useDeleteTransaction', () => {
  it('calls repository.remove on mutate', async () => {
    const repo = createMockTransactionRepository()
    repo.remove.mockResolvedValue(true)
    const { result } = mountWithComposable(() => useDeleteTransaction(), {
      repositories: { transactions: repo },
    })
    await result.mutateAsync('t1')
    expect(repo.remove).toHaveBeenCalledWith('t1')
  })
})
