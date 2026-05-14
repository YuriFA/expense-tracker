import z from 'zod'
import i18n from '@/app/i18n'

export const createTransactionsFilterSchema = () => {
  const { t } = i18n.global

  return z.object({
    fromDate: z.date({ error: t('validation.invalidDate') }).optional(),
    toDate: z.date({ error: t('validation.invalidDate') }).optional(),
    type: z
      .enum(['expense', 'income', 'transfer'], {
        message: t('validation.transactionTypeRequired'),
      })
      .optional(),
    accountId: z
      .string({ error: t('validation.accountRequired') })
      .min(1, t('validation.accountRequired'))
      .optional(),
    categoryId: z
      .string({ error: t('validation.categoryRequired') })
      .min(1, t('validation.categoryRequired'))
      .optional(),
  })
}

export type TransactionsFilterFormValues = z.infer<
  ReturnType<typeof createTransactionsFilterSchema>
>
