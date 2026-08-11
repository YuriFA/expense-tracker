import { z } from 'zod'
import type { TFunction } from 'i18next'
import type { CategoryType } from '@expense-tracker/api'

/**
 * Zod form schema for the category create / edit sheet. Mirrors the
 * `@expense-tracker/api` payload contracts:
 *  - `CreateCategoryPayload`: { name, type, icon, color }
 *  - `UpdateCategoryPayload`: { name?, type?, icon?, color? }
 *
 * `type` is income/expense (transfers have no category). `icon` + `color` are
 * picked together from the curated palette in `category-icons.ts`; both are
 * required non-empty strings.
 */
const categoryTypeValues = ['expense', 'income'] as [CategoryType, ...CategoryType[]]

export function categoryFormSchema(t: TFunction) {
  return z.object({
    name: z
      .string({ error: t('validation.enter', { field: t('addCategory.nameLabel') }) })
      .trim()
      .min(1, t('validation.enter', { field: t('addCategory.nameLabel') })),
    type: z.enum(categoryTypeValues),
    icon: z.string().min(1),
    color: z.string().min(1),
  })
}
export type CategoryFormValues = z.infer<ReturnType<typeof categoryFormSchema>>
