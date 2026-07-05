import type { CurrencyCode } from '@/shared/lib/money'

export type Account = {
  id: string
  name: string
  currency: CurrencyCode
  openingBalance: number
  manualAdjustment: number
}

export type AccountWithBalance = Account & {
  balance: number
}
