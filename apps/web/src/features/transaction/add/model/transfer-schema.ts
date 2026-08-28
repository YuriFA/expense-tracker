import z from 'zod'
import i18n from '@/shared/i18n'
import { isIsoDateTime } from '@/shared/lib/date'

export const createTransferSchema = () => {
  const { t } = i18n.global

  return z
    .object({
      type: z.literal('transfer', {
        message: t('validation.select', { field: t('fields.transactionType') }),
      }),
      fromAccountId: z
        .string({ error: t('validation.select', { field: t('fields.fromAccount') }) })
        .min(1, t('validation.select', { field: t('fields.fromAccount') })),
      toAccountId: z
        .string({ error: t('validation.select', { field: t('fields.toAccount') }) })
        .min(1, t('validation.select', { field: t('fields.toAccount') })),
      amount: z
        .number({ error: t('validation.enter', { field: t('fields.amount') }) })
        .positive(t('validation.mustBePositive', { field: t('fields.amount') })),
      description: z
        .string({ error: t('validation.mustBeString', { field: t('fields.description') }) })
        .optional(),
      occurredAt: z
        .string({ error: t('validation.enter', { field: t('fields.date') }) })
        .refine(isIsoDateTime, t('validation.enter', { field: t('fields.date') })),
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      path: ['toAccountId'],
      message: t('validation.transferAccountsMustDiffer'),
    })
}

export type TransferFormValues = z.infer<ReturnType<typeof createTransferSchema>>
