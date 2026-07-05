import { APP_NAME } from '@/shared/config/app'

const STORAGE_KEY = `${APP_NAME}:last-account-ids`

export type LastTransferAccountIds = {
  fromAccountId: string | null
  toAccountId: string | null
}

type StoredShape = {
  cashflowAccountId: string | null
  transfer: LastTransferAccountIds
}

const DEFAULT: StoredShape = {
  cashflowAccountId: null,
  transfer: { fromAccountId: null, toAccountId: null },
}

const withDefaults = (value: StoredShape): StoredShape => ({
  ...value,
  transfer: { ...value.transfer },
})

function read(): StoredShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return withDefaults(DEFAULT)
    const parsed = JSON.parse(raw) as Partial<StoredShape>
    return withDefaults({
      cashflowAccountId:
        typeof parsed.cashflowAccountId === 'string' ? parsed.cashflowAccountId : null,
      transfer: {
        fromAccountId:
          parsed.transfer && typeof parsed.transfer.fromAccountId === 'string'
            ? parsed.transfer.fromAccountId
            : null,
        toAccountId:
          parsed.transfer && typeof parsed.transfer.toAccountId === 'string'
            ? parsed.transfer.toAccountId
            : null,
      },
    })
  } catch {
    return withDefaults(DEFAULT)
  }
}

function write(value: StoredShape): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export const lastAccountIds = {
  getCashflowAccountId(): string | null {
    return read().cashflowAccountId
  },
  setCashflowAccountId(accountId: string): void {
    write({ ...read(), cashflowAccountId: accountId })
  },
  getTransferAccountIds(): LastTransferAccountIds {
    return read().transfer
  },
  setTransferAccountIds(fromAccountId: string, toAccountId: string): void {
    write({ ...read(), transfer: { fromAccountId, toAccountId } })
  },
}
