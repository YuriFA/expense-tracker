import z from 'zod'
import i18n from '@/shared/i18n'

export const createEditAccountSchema = () => {
  const { t } = i18n.global

  return z.object({
    name: z
      .string({ error: t('validation.enter', { field: t('fields.name') }) })
      .min(1, t('validation.enter', { field: t('fields.name') })),
    manualAdjustment: z.number({
      error: t('validation.enter', { field: t('fields.openingBalance') }),
    }),
  })
}

export type EditAccountFormValues = z.infer<ReturnType<typeof createEditAccountSchema>>
