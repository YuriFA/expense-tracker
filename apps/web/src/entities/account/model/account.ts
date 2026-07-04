import type { Account } from './types'
import { asNonEmptyString, asNumber, asString, isRecord } from '@/shared/lib/normalize'

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
