import z from 'zod'
import i18n from '@/shared/i18n'

export const createTransactionsFilterSchema = () => {
  const { t } = i18n.global

  return z.object({
    fromDate: z
      .date({ error: t('validation.mustBeDate', { field: t('fields.date') }) })
      .optional(),
    toDate: z
      .date({ error: t('validation.mustBeDate', { field: t('fields.date') }) })
      .optional(),
    type: z
      .enum(['expense', 'income', 'transfer'], {
        message: t('validation.select', { field: t('fields.transactionType') }),
      })
      .optional(),
    accountId: z
      .array(
        z.string({ error: t('validation.select', { field: t('fields.account') }) }).min(1),
      )
      .optional(),
    categoryId: z
      .array(
        z.string({ error: t('validation.select', { field: t('fields.category') }) }).min(1),
      )
      .optional(),
  })
}

export type TransactionsFilterFormValues = z.infer<
  ReturnType<typeof createTransactionsFilterSchema>
>
