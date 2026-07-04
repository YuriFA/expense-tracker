import { describe, it, expect } from 'vitest'
import { createApp, h } from 'vue'
import { provideRepositories } from './repositories'
import { ACCOUNT_REPOSITORY_KEY } from '@/entities/account'
import { CATEGORY_REPOSITORY_KEY } from '@/entities/category'
import { TRANSACTION_REPOSITORY_KEY } from '@/entities/transaction'
import type { Account } from '@/entities/account'
import type { Transaction } from '@/entities/transaction'

describe('provideRepositories', () => {
  it('registers all three repository keys on the app', async () => {
    const app = createApp({
      setup() {
        return () => h('div')
      },
    })
    provideRepositories(app)
    app.mount(document.createElement('div'))

    const provides = (app as unknown as {
      _context: { provides: Record<symbol, unknown> }
    })._context.provides

    expect(provides[ACCOUNT_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
    expect(provides[CATEGORY_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
    expect(provides[TRANSACTION_REPOSITORY_KEY as unknown as symbol]).toBeDefined()
  })

  it('wires cross-repository dependencies (account needs transactions, transaction needs accounts+categories)', async () => {
    const app = createApp({
      setup() {
        return () => h('div')
      },
    })
    provideRepositories(app)
    app.mount(document.createElement('div'))

    const provides = (app as unknown as {
      _context: { provides: Record<symbol, unknown> }
    })._context.provides
    const accounts = provides[
      ACCOUNT_REPOSITORY_KEY as unknown as symbol
    ] as unknown as {
      getAll: () => Promise<Account[]>
      create: (payload: { name: string; openingBalance: number; id?: string }) => Promise<Account>
    }
    const transactions = provides[
      TRANSACTION_REPOSITORY_KEY as unknown as symbol
    ] as unknown as { getAll: () => Promise<Transaction[]> }

    // Create an account; it should round-trip through storage
    const created = await accounts.create({ name: 'Main', openingBalance: 100 })
    expect(created.id).toBeTruthy()

    // transactions.getAll should be able to invoke its dep (accounts.getAll)
    const allTransactions = await transactions.getAll()
    expect(Array.isArray(allTransactions)).toBe(true)

    const allAccounts = await accounts.getAll()
    expect(allAccounts).toHaveLength(1)
    expect(allAccounts[0]?.name).toBe('Main')
  })
})
