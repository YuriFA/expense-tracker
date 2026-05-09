import z from 'zod'
import i18n from '@/app/i18n'

export const createAddTransactionSchema = () => {
  const { t } = i18n.global

  return z.object({
    type: z.enum(['expense', 'income'], {
      message: t('validation.transactionTypeRequired'),
    }),
    accountId: z.string().min(1, t('validation.accountRequired')),
    amount: z.number().positive(t('validation.amountPositive')),
    description: z.string().optional(),
    category: z.string().min(1, t('validation.categoryRequired')),
  })
}

export type AddTransactionFormValues = z.infer<ReturnType<typeof createAddTransactionSchema>>
