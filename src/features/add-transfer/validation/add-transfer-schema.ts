import z from 'zod'
import i18n from '@/app/i18n'

export const createAddTransferSchema = () => {
  const { t } = i18n.global

  return z
    .object({
      type: z.literal('transfer', {
        message: t('validation.transactionTypeRequired'),
      }),
      fromAccountId: z.string().min(1, t('validation.fromAccountRequired')),
      toAccountId: z.string().min(1, t('validation.toAccountRequired')),
      amount: z
        .string()
        .transform((val, ctx) => {
          const parsed = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'))

          if (Number.isNaN(parsed)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('validation.amountRequired'),
            })

            return z.NEVER
          }

          return parsed
        })
        .pipe(z.number().positive(t('validation.amountPositive'))),
      description: z.string().optional(),
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      path: ['toAccountId'],
      message: t('validation.transferAccountsMustDiffer'),
    })
}

export type AddTransferFormValues = z.infer<ReturnType<typeof createAddTransferSchema>>
