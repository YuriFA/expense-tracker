export type TransactionType = 'income' | 'expense' | 'transfer'

type BaseTransaction = {
  id: string
  type: TransactionType
  amount: number
  description: string
  occurredAt: string
  createdAt: string
  updatedAt?: string
}

export type CashflowTransaction = BaseTransaction & {
  type: 'income' | 'expense'
  accountId: string
  categoryId: string
}

export type TransferTransaction = BaseTransaction & {
  type: 'transfer'
  fromAccountId: string
  toAccountId: string
  categoryId?: never
}

export type Transaction = CashflowTransaction | TransferTransaction
