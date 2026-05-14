import type { BrandedIsoDateTime, IsoDateTime } from './types'

const asIsoDateTime = (value: string): BrandedIsoDateTime => value as BrandedIsoDateTime

const toNativeDate = (value: Date | IsoDateTime) => {
  return value instanceof Date ? value : new Date(value)
}

export const isIsoDateTime = (value: string): value is BrandedIsoDateTime => {
  return !Number.isNaN(Date.parse(value))
}

export const nowIsoString = (): IsoDateTime => asIsoDateTime(new Date().toISOString())

export const parseIsoDateTime = (value: string) => {
  if (!isIsoDateTime(value)) {
    throw new Error(`Invalid ISO datetime: ${value}`)
  }

  return toNativeDate(value)
}

export const getDateTimestamp = (value: Date | IsoDateTime) => toNativeDate(value).getTime()
