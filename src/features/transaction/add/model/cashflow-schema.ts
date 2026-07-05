import z from 'zod'
import i18n from '@/shared/i18n'

export const createCashflowSchema = () => {
  const { t } = i18n.global

  return z.object({
    type: z.enum(['expense', 'income'], {
      message: t('validation.transactionTypeRequired'),
    }),
    accountId: z
      .string({ error: t('validation.accountRequired') })
      .min(1, t('validation.accountRequired')),
    amount: z
      .number({ error: t('validation.amountRequired') })
      .positive(t('validation.amountPositive')),
    description: z.string({ error: t('validation.descriptionInvalid') }).optional(),
    categoryId: z
      .string({ error: t('validation.categoryRequired') })
      .min(1, t('validation.categoryRequired')),
  })
}

export type CashflowFormValues = z.infer<ReturnType<typeof createCashflowSchema>>
