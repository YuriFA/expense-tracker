import z from 'zod'
import i18n from '@/shared/i18n'
import { isIsoDateTime } from '@/shared/lib/date'

export const createCashflowSchema = () => {
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
    // Date picker always supplies a value (defaults to now); validated as a
    // proper ISO datetime because it goes straight into the create payload.
    occurredAt: z
      .string({ error: t('validation.enter', { field: t('fields.date') }) })
      .refine(isIsoDateTime, t('validation.enter', { field: t('fields.date') })),
  })
}

export type CashflowFormValues = z.infer<ReturnType<typeof createCashflowSchema>>
