import type { Account } from '@/types/account'
import type { Transaction } from '@/types/transaction'
import { isTransferTransaction } from './transaction'
import { asNonEmptyString, asNumber, asString, isRecord } from '@/shared/lib/normalize'

export const getTransactionImpactForAccount = (transaction: Transaction, accountId: string) => {
  if (!isTransferTransaction(transaction)) {
    if (transaction.type === 'income') {
      return transaction.accountId === accountId ? transaction.amount : 0
    }

    return transaction.accountId === accountId ? -transaction.amount : 0
  }

  if (transaction.fromAccountId === accountId) {
    return -transaction.amount
  }

  if (transaction.toAccountId === accountId) {
    return transaction.amount
  }

  return 0
}

export const sumTransactionsImpactForAccount = (transactions: Transaction[], accountId: string) =>
  transactions.reduce(
    (total, transaction) => total + getTransactionImpactForAccount(transaction, accountId),
    0,
  )

export const getComputedAccountBalance = (account: Account, transactions: Transaction[]) =>
  account.openingBalance +
  account.manualAdjustment +
  sumTransactionsImpactForAccount(transactions, account.id)

export const normalizeAccount = (value: unknown): Account | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const name = asString(value.name)
  const openingBalance = asNumber(value.openingBalance)
  const manualAdjustment = asNumber(value.manualAdjustment)

  if (!id || name === null || openingBalance === null || manualAdjustment === null) {
    return null
  }

  return {
    id,
    name,
    openingBalance,
    manualAdjustment,
  }
}

export const parseAccountsStorage = (value: string): Account[] => {
  try {
    const parsedValue: unknown = JSON.parse(value)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((item) => {
      const account = normalizeAccount(item)

      return account ? [account] : []
    })
  } catch {
    return []
  }
}

export const serializeAccountsStorage = (value: Account[]) => JSON.stringify(value)
