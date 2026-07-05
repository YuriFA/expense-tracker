import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { AccountWithBalance } from './types'
import { useAccounts, useAccount, useCreateAccount, useUpdateAccount, useDeleteAccount } from './use-accounts'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const accountFixture: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

function mountWithComposable<T>(
  composable: () => T,
  options: Parameters<typeof mountWithProviders>[1] = {},
): { wrapper: ReturnType<typeof mountWithProviders>; result: T } {
  let result!: T
  const TestComponent = defineComponent({
    setup() {
      result = composable()
      return () => h('div')
    },
  })
  const wrapper = mountWithProviders(TestComponent, options)
  return { wrapper, result }
}

describe('useAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls repository.getAll on mount', async () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockResolvedValue([accountFixture])
    const { result } = mountWithComposable(() => useAccounts(), {
      repositories: { accounts: repo },
    })
    await flushPromises()
    await flushPromises()
    expect(repo.getAll).toHaveBeenCalled()
    expect(result.data.value).toEqual([accountFixture])
  })

  it('exposes loading state initially', () => {
    const repo = createMockAccountRepository()
    repo.getAll.mockReturnValue(new Promise<AccountWithBalance[]>(() => {})) // never resolves
    const { result } = mountWithComposable(() => useAccounts(), {
      repositories: { accounts: repo },
    })
    expect(result.isLoading.value).toBe(true)
  })
})

describe('useAccount', () => {
  it('disables query when id is undefined', () => {
    const repo = createMockAccountRepository()
    const { result } = mountWithComposable(() => useAccount(() => undefined), {
      repositories: { accounts: repo },
    })
    expect(repo.getById).not.toHaveBeenCalled()
    expect(result.isLoading.value).toBe(false)
  })

  it('fetches when id is provided', async () => {
    const repo = createMockAccountRepository()
    repo.getById.mockResolvedValue(accountFixture)
    mountWithComposable(() => useAccount(() => 'a1'), {
      repositories: { accounts: repo },
    })
    await flushPromises()
    await flushPromises()
    expect(repo.getById).toHaveBeenCalledWith('a1')
  })
})

describe('useCreateAccount', () => {
  it('calls repository.create on mutate', async () => {
    const repo = createMockAccountRepository()
    repo.create.mockResolvedValue(accountFixture)
    const { result } = mountWithComposable(() => useCreateAccount(), {
      repositories: { accounts: repo },
    })
    await result.mutateAsync({ name: 'Main', currency: 'USD', openingBalance: 1000 })
    expect(repo.create).toHaveBeenCalledWith({ name: 'Main', currency: 'USD', openingBalance: 1000 })
  })
})

describe('useUpdateAccount', () => {
  it('calls repository.update on mutate', async () => {
    const repo = createMockAccountRepository()
    repo.update.mockResolvedValue(accountFixture)
    const { result } = mountWithComposable(() => useUpdateAccount(), {
      repositories: { accounts: repo },
    })
    await result.mutateAsync({ id: 'a1', payload: { name: 'Updated' } })
    expect(repo.update).toHaveBeenCalledWith('a1', { name: 'Updated' })
  })
})

describe('useDeleteAccount', () => {
  it('calls repository.remove on mutate', async () => {
    const repo = createMockAccountRepository()
    repo.remove.mockResolvedValue(undefined)
    const { result } = mountWithComposable(() => useDeleteAccount(), {
      repositories: { accounts: repo },
    })
    await result.mutateAsync('a1')
    expect(repo.remove).toHaveBeenCalledWith('a1')
  })
})
