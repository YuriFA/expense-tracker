import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { AccountWithBalance } from '@/entities/account/types'
import type { Category } from '@/entities/category/types'
import type { CashflowTransaction, TransferTransaction } from '@/entities/transaction/types'
import { useLastCreatedTransaction } from './use-transaction-form-data'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accountFixture: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

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

describe('useLastCreatedTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns last cashflow transaction that references a known account', async () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockResolvedValue([accountFixture])
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockResolvedValue([incomeTransaction])
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(result.lastCreatedCashflowTransaction.value?.id).toBe('t1')
  })

  it('returns null for cashflow transaction when no matching account', async () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockResolvedValue([])
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockResolvedValue([incomeTransaction])
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(result.lastCreatedCashflowTransaction.value).toBeUndefined()
  })

  it('returns last transfer transaction that references a known fromAccount', async () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockResolvedValue([accountFixture])
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockResolvedValue([transferTransaction])
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(result.lastCreatedTransferTransaction.value?.id).toBe('t2')
  })

  it('returns undefined for transfer when no matching fromAccount', async () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockResolvedValue([])
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockResolvedValue([transferTransaction])
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(result.lastCreatedTransferTransaction.value).toBeUndefined()
  })

  it('exposes isReady flag that becomes true after loading', async () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockResolvedValue([accountFixture])
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockResolvedValue([])
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(result.isReady.value).toBe(true)
  })

  it('isReady stays false while queries are loading', () => {
    const accounts = createMockAccountRepository()
    vi.mocked(accounts.getAll).mockReturnValue(new Promise<AccountWithBalance[]>(() => {}))
    const transactions = createMockTransactionRepository()
    vi.mocked(transactions.query).mockReturnValue(new Promise<never>(() => {}))
    const categories = createMockCategoryRepository()

    const { result } = mountWithComposable(() => useLastCreatedTransaction(), {
      repositories: { accounts, categories, transactions },
    })

    expect(result.isReady.value).toBe(false)
  })
})
