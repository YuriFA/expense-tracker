import z from 'zod'
import i18n from '@/shared/i18n'

export const createAdjustmentEditSchema = () => {
  const { t } = i18n.global

  return z.object({
    type: z.literal('adjustment'),
    accountId: z
      .string({ error: t('validation.select', { field: t('fields.account') }) })
      .min(1, t('validation.select', { field: t('fields.account') })),
    // The delta is edited directly (not via a target balance): at edit time
    // the user is correcting the correction, and the raw signed value is
    // the honest representation.
    amount: z
      .number({ error: t('validation.enter', { field: t('fields.amount') }) })
      .refine((v) => v !== 0, {
        message: i18n.global.t('validation.adjustmentNonZero'),
      }),
    description: z
      .string({ error: t('validation.mustBeString', { field: t('fields.description') }) })
      .optional(),
  })
}

export type AdjustmentEditValues = z.infer<ReturnType<typeof createAdjustmentEditSchema>>
