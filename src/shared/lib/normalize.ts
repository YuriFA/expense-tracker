import { isIsoDateTime, type IsoDateTime } from '@/shared/lib/date'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const asString = (value: unknown) => (typeof value === 'string' ? value : null)

export const asNonEmptyString = (value: unknown) => {
  const stringValue = asString(value)

  return stringValue && stringValue.trim().length > 0 ? stringValue : null
}

export const asNumber = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return value
}

export const asPositiveNumber = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return value
}

export const asDateTimeString = (value: unknown) => {
  const stringValue = asNonEmptyString(value)

  if (!stringValue || !isIsoDateTime(stringValue)) {
    return null
  }

  return stringValue as IsoDateTime
}
