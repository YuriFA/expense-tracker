import type { Account } from './types'
import { asInteger, asNonEmptyString, asString, isRecord } from '@/shared/lib/normalize'
import { isCurrencyCode } from '@/shared/lib/money'

export const normalizeAccount = (value: unknown): Account | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const name = asString(value.name)
  const currency = isCurrencyCode(value.currency) ? value.currency : null
  const openingBalance = asInteger(value.openingBalance)
  const manualAdjustment = asInteger(value.manualAdjustment)

  if (!id || name === null || currency === null || openingBalance === null || manualAdjustment === null) {
    return null
  }

  return {
    id,
    name,
    currency,
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
