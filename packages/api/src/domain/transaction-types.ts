export type TransactionType = 'income' | 'expense' | 'transfer'

type BaseTransaction = {
  id: string
  type: TransactionType
  amount: number
  description?: string
  occurredAt: string
  updatedAt?: string
  /** Optimistic-concurrency version from the server; sent back on PATCH. */
  version: number
  /**
   * Who created/last changed the record (household authorship, household-ux):
   * the local-data row's `userId`. Absent on the REST contract surface (only
   * sync delivers it) and on records authored before authorship existed.
   */
  authorId?: string | null
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
