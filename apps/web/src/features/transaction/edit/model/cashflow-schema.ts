import z from 'zod'
import i18n from '@/shared/i18n'

export const createCashflowEditSchema = () => {
  const { t } = i18n.global

  return z.object({
    type: z.enum(['expense', 'income'], {
      message: t('validation.select', { field: t('fields.transactionType') }),
    }),
    accountId: z
      .string({ error: t('validation.select', { field: t('fields.account') }) })
      .min(1, t('validation.select', { field: t('fields.account') })),
    amount: z
      .number({ error: t('validation.enter', { field: t('fields.amount') }) })
      .positive(t('validation.mustBePositive', { field: t('fields.amount') })),
    description: z
      .string({ error: t('validation.mustBeString', { field: t('fields.description') }) })
      .optional(),
    categoryId: z
      .string({ error: t('validation.select', { field: t('fields.category') }) })
      .min(1, t('validation.select', { field: t('fields.category') })),
  })
}

export type CashflowEditValues = z.infer<ReturnType<typeof createCashflowEditSchema>>
