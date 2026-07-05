import type { Account } from '../model/types'
import { parseAccountsStorage, serializeAccountsStorage } from '../model/account'
import {
  getAccountsBalances,
  getComputedAccountBalance,
  type TransactionImpact,
} from '../model/balance-calculator'
import type {
  AccountRepository,
  CreateAccountPayload,
  UpdateAccountPayload,
} from './repository'
import { STORAGE_KEYS } from '@/shared/config/storage-keys'
import { generateId } from '@/shared/lib/generate-id'
import {
  createLocalStorageAdapter,
  NotFoundError,
  ReferentialIntegrityError,
} from '@/shared/lib/data'

const accountsStorage = createLocalStorageAdapter<Account[]>(STORAGE_KEYS.accounts, [], {
  read: parseAccountsStorage,
  write: serializeAccountsStorage,
})

export function createLocalStorageAccountRepository(deps: {
  hasTransactionsForAccount: (accountId: string) => Promise<boolean>
  getAllTransactions: () => Promise<TransactionImpact[]>
}): AccountRepository {
  return {
    async getAll() {
      const [accounts, transactions] = await Promise.all([
        accountsStorage.get(),
        deps.getAllTransactions(),
      ])
      const balances = getAccountsBalances(accounts, transactions)
      return accounts.map((account) => ({
        ...account,
        balance: balances[account.id] ?? account.openingBalance + account.manualAdjustment,
      }))
    },
    async getById(id: string) {
      const [account, transactions] = await Promise.all([
        accountsStorage.get().find((item) => item.id === id) ?? null,
        deps.getAllTransactions(),
      ])
      if (!account) {
        return null
      }

      return { ...account, balance: getComputedAccountBalance(account, transactions) }
    },
    async create(payload: CreateAccountPayload) {
      const account: Account = {
        ...payload,
        id: payload.id ?? generateId(),
        manualAdjustment: 0,
      }
      const accounts = accountsStorage.get()
      accounts.push(account)
      accountsStorage.set(accounts)
      return { ...account, balance: getComputedAccountBalance(account, []) }
    },
    async update(id, payload: UpdateAccountPayload) {
      const accounts = accountsStorage.get()
      const target = accounts.find((item) => item.id === id)

      if (!target) {
        throw new NotFoundError('Account not found')
      }

      const transactions = await deps.getAllTransactions()
      const updated = Object.assign({}, target, payload, {
        balance: getComputedAccountBalance({ ...target, ...payload }, transactions),
      })
      accountsStorage.set(accounts.map((a) => (a.id === id ? updated : a)))
      return updated
    },
    async remove(id) {
      if (await deps.hasTransactionsForAccount(id)) {
        throw new ReferentialIntegrityError(
          `Account has referencing transactions`,
        )
      }
      const accounts = accountsStorage.get()
      const next = accounts.filter((item) => item.id !== id)
      if (next.length === accounts.length) {
        throw new NotFoundError(`Account not found`)
      }

      accountsStorage.set(next)
    },
  }
}
