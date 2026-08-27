// Zod schema factory for the plan form (validation messages resolve `t()` at
// form mount). Amount is majors inside the form; the type is fixed by the
// calling context (immutable per the planned-payments capability). A past
// next-due date is legal (the plan starts out overdue).

import z from 'zod'
import i18n from '@/shared/i18n'

export const createPlanSchema = () => {
  const { t } = i18n.global
  return z.object({
    amount: z
      .number({ error: t('validation.enter', { field: t('fields.amount') }) })
      .positive(t('validation.mustBePositive', { field: t('fields.amount') })),
    name: z.string(),
    accountId: z
      .string({ error: t('validation.select', { field: t('fields.account') }) })
      .min(1, t('validation.select', { field: t('fields.account') })),
    categoryId: z
      .string({ error: t('validation.select', { field: t('fields.category') }) })
      .min(1, t('validation.select', { field: t('fields.category') })),
    nextDue: z
      .string()
      .min(1, t('validation.select', { field: t('fields.date') }))
      .regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.mustBeDate', { field: t('fields.date') })),
    regularity: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    confirmMode: z.enum(['manual', 'auto']),
    reminder: z.enum(['off', 'day_before', 'on_day']),
    note: z.string(),
  })
}
export type PlanFormValues = z.infer<ReturnType<typeof createPlanSchema>>
