import z from 'zod'
import i18n from '@/shared/i18n'
import { AVAILABLE_CURRENCIES, isCurrencyCode } from '@/shared/lib/money'

export const createAddAccountSchema = () => {
  const { t } = i18n.global

  return z.object({
    name: z.string({ error: t('validation.nameRequired') }).min(1, t('validation.nameRequired')),
    currency: z
      .string({ error: t('validation.nameRequired') })
      .refine(isCurrencyCode, t('validation.nameRequired')),
    openingBalance: z
      .number({ error: t('validation.openingBalanceRequired') })
      .nonnegative(t('validation.openingBalanceNonNegative')),
  })
}

export type AddAccountFormValues = z.infer<ReturnType<typeof createAddAccountSchema>> & {
  currency: (typeof AVAILABLE_CURRENCIES)[number]
}
