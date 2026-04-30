import type {
  CashflowTransaction,
  Transaction,
  TransferTransaction,
  TransactionType,
} from '@/types/transaction'
import type { Account } from '@/types/account'
import type { Category } from '@/types/category'
import {
  asDateTimeString,
  asNonEmptyString,
  asPositiveNumber,
  asString,
  isRecord,
} from '@/shared/lib/normalize'

type TransactionRecord = Record<string, unknown>

type BaseTransaction = {
  id: string
  type: TransactionType
  amount: number
  description: string
  occurredAt: string
  createdAt: string
  updatedAt?: string
}

const isTransactionType = (value: unknown): value is TransactionType =>
  value === 'income' || value === 'expense' || value === 'transfer'

const normalizeBaseTransaction = (value: TransactionRecord): BaseTransaction | null => {
  const id = asNonEmptyString(value.id)
  const type = isTransactionType(value.type) ? value.type : null
  const amount = asPositiveNumber(value.amount)
  const description = asString(value.description)
  const occurredAt = asDateTimeString(value.occurredAt)
  const createdAt = asDateTimeString(value.createdAt)
  const updatedAtValue =
    value.updatedAt === undefined ? undefined : asDateTimeString(value.updatedAt)

  if (!id || !type || !amount || description === null || !occurredAt || !createdAt) {
    return null
  }

  if (value.updatedAt !== undefined && !updatedAtValue) {
    return null
  }

  return {
    id,
    type,
    amount,
    description,
    occurredAt,
    createdAt,
    ...(updatedAtValue ? { updatedAt: updatedAtValue } : {}),
  }
}

const normalizeCashflowTransaction = (
  value: TransactionRecord,
  baseTransaction: BaseTransaction | null,
): CashflowTransaction | null => {
  if (
    !baseTransaction ||
    (baseTransaction.type !== 'income' && baseTransaction.type !== 'expense')
  ) {
    return null
  }

  const accountId = asNonEmptyString(value.accountId)
  const categoryId = asNonEmptyString(value.categoryId)

  if (!accountId || !categoryId) {
    return null
  }

  return {
    ...baseTransaction,
    type: baseTransaction.type,
    accountId,
    categoryId,
  } as CashflowTransaction
}

const normalizeTransferTransaction = (
  value: TransactionRecord,
  baseTransaction: BaseTransaction | null,
): TransferTransaction | null => {
  if (!baseTransaction || baseTransaction.type !== 'transfer') {
    return null
  }

  const fromAccountId = asNonEmptyString(value.fromAccountId)
  const toAccountId = asNonEmptyString(value.toAccountId)

  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return null
  }

  return {
    ...baseTransaction,
    type: 'transfer',
    fromAccountId,
    toAccountId,
  }
}

export const isTransaction = (value: unknown): value is Transaction => {
  return normalizeTransaction(value) !== null
}

export const isTransferTransaction = (
  transaction: Transaction,
): transaction is TransferTransaction => {
  if (transaction.type === 'transfer') {
    return true
  }

  return false
}

export const isTransactionLinkedToAccount = (transaction: Transaction, accountId: string) => {
  if (isTransferTransaction(transaction)) {
    return transaction.fromAccountId === accountId || transaction.toAccountId === accountId
  }

  return transaction.accountId === accountId
}

export const isTransactionLinkedToCategory = (transaction: Transaction, categoryId: string) => {
  if (isTransferTransaction(transaction)) {
    return false
  }

  return transaction.categoryId === categoryId
}

export const hasValidTransactionReferences = (
  transaction: Transaction,
  accounts: Account[],
  categories: Category[],
) => {
  const hasAccount = (accountId: string) => accounts.some((account) => account.id === accountId)

  if (isTransferTransaction(transaction)) {
    return (
      hasAccount(transaction.fromAccountId) &&
      hasAccount(transaction.toAccountId) &&
      transaction.fromAccountId !== transaction.toAccountId
    )
  }

  const category = categories.find((item) => item.id === transaction.categoryId)

  return hasAccount(transaction.accountId) && category !== undefined && category.type === transaction.type
}

export const normalizeTransaction = (value: unknown): Transaction | null => {
  if (!isRecord(value)) {
    return null
  }

  const baseTransaction = normalizeBaseTransaction(value)

  if (!baseTransaction) {
    return null
  }

  if (baseTransaction.type === 'transfer') {
    return normalizeTransferTransaction(value, baseTransaction)
  }

  return normalizeCashflowTransaction(value, baseTransaction)
}

export const parseTransactionsStorage = (value: string): Transaction[] => {
  try {
    const parsedValue: unknown = JSON.parse(value)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((item) => {
      const transaction = normalizeTransaction(item)

      return transaction ? [transaction] : []
    })
  } catch {
    return []
  }
}

export const serializeTransactionsStorage = (value: Transaction[]) => JSON.stringify(value)
