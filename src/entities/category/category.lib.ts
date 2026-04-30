import type { Category, CategoryType } from '@/types/category'
import { asNonEmptyString, asString, isRecord } from '@/shared/lib/normalize'

const isCategoryType = (value: unknown): value is CategoryType =>
  value === 'income' || value === 'expense'

export const normalizeCategory = (value: unknown): Category | null => {
  if (!isRecord(value)) {
    return null
  }

  const id = asNonEmptyString(value.id)
  const name = asString(value.name)
  const type = isCategoryType(value.type) ? value.type : null
  const icon = asString(value.icon)
  const color = asString(value.color)

  if (!id || !name || !type || !icon || !color) {
    return null
  }

  return {
    id,
    name,
    type,
    icon,
    color,
  }
}

export const parseCategoriesStorage = (value: string): Category[] => {
  try {
    const parsedValue: unknown = JSON.parse(value)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.flatMap((item) => {
      const account = normalizeCategory(item)

      return account ? [account] : []
    })
  } catch {
    return []
  }
}

export const serializeCategoriesStorage = (value: Category[]) => JSON.stringify(value)
