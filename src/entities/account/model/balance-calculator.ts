import type { Account } from '../model/types'

export type TransactionImpact =
  | { readonly type: 'income' | 'expense'; readonly accountId: string; readonly amount: number }
  | {
      readonly type: 'transfer'
      readonly fromAccountId: string
      readonly toAccountId: string
      readonly amount: number
    }

const isTransfer = (
  transaction: TransactionImpact,
): transaction is Extract<TransactionImpact, { type: 'transfer' }> => transaction.type === 'transfer'

export const getTransactionImpactForAccount = (
  transaction: TransactionImpact,
  accountId: string,
) => {
  if (!isTransfer(transaction)) {
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

export const sumTransactionsImpactForAccount = (
  transactions: TransactionImpact[],
  accountId: string,
) =>
  transactions.reduce(
    (total, transaction) => total + getTransactionImpactForAccount(transaction, accountId),
    0,
  )

export const getAccountsBalances = (
  accounts: Account[],
  transactions: TransactionImpact[],
) => {
  const balancesByAccountId = Object.fromEntries(
    accounts.map((account) => [account.id, account.openingBalance + account.manualAdjustment]),
  ) as Record<string, number>

  for (const transaction of transactions) {
    if (!isTransfer(transaction)) {
      const currentBalance = balancesByAccountId[transaction.accountId]

      if (currentBalance !== undefined) {
        balancesByAccountId[transaction.accountId] =
          currentBalance +
          (transaction.type === 'income' ? transaction.amount : -transaction.amount)
      }

      continue
    }

    const fromBalance = balancesByAccountId[transaction.fromAccountId]

    if (fromBalance !== undefined) {
      balancesByAccountId[transaction.fromAccountId] = fromBalance - transaction.amount
    }

    const toBalance = balancesByAccountId[transaction.toAccountId]

    if (toBalance !== undefined) {
      balancesByAccountId[transaction.toAccountId] = toBalance + transaction.amount
    }
  }

  return balancesByAccountId
}

export const getComputedAccountBalance = (
  account: Account,
  transactions: TransactionImpact[],
) =>
  account.openingBalance +
  account.manualAdjustment +
  sumTransactionsImpactForAccount(transactions, account.id)
