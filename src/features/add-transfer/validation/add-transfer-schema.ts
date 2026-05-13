import z from 'zod'
import i18n from '@/app/i18n'

export const createAddTransferSchema = () => {
  const { t } = i18n.global

  return z
    .object({
      type: z.literal('transfer', {
        message: t('validation.transactionTypeRequired'),
      }),
      fromAccountId: z
        .string({ error: t('validation.fromAccountRequired') })
        .min(1, t('validation.fromAccountRequired')),
      toAccountId: z
        .string({ error: t('validation.toAccountRequired') })
        .min(1, t('validation.toAccountRequired')),
      amount: z
        .number({ error: t('validation.amountRequired') })
        .positive(t('validation.amountPositive')),
      description: z.string({ error: t('validation.descriptionInvalid') }).optional(),
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      path: ['toAccountId'],
      message: t('validation.transferAccountsMustDiffer'),
    })
}

export type AddTransferFormValues = z.infer<ReturnType<typeof createAddTransferSchema>>
