export type Account = {
  id: string
  name: string
  openingBalance: number
  manualAdjustment: number
}

export type AccountWithBalance = Account & {
  balance: number
}
