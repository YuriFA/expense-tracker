import z from 'zod'
import i18n from '@/shared/i18n'
import { AVAILABLE_CURRENCIES } from '@/shared/lib/money'

export const createAddAccountSchema = () => {
  const { t } = i18n.global

  return z.object({
    name: z
      .string({ error: t('validation.enter', { field: t('fields.name') }) })
      .min(1, t('validation.enter', { field: t('fields.name') })),
    currency: z.enum(AVAILABLE_CURRENCIES, {
      error: t('validation.select', { field: t('fields.currency') }),
    }),
    openingBalance: z
      .number({ error: t('validation.enter', { field: t('fields.openingBalance') }) })
      .nonnegative(
        t('validation.mustBeNonNegative', { field: t('fields.openingBalance') }),
      ),
  })
}

export type AddAccountFormValues = z.infer<ReturnType<typeof createAddAccountSchema>>
