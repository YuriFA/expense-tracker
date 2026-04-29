import type { TransactionType } from './transaction'

export interface Category {
  id: string
  name: string
  type: TransactionType
  icon: string
  color: string
}
