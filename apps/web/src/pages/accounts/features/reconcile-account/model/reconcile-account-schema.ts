import z from 'zod'
import i18n from '@/shared/i18n'

export const createReconcileAccountSchema = () => {
  const { t } = i18n.global

  return z.object({
    // Non-negative like every web money input (the add-account opening
    // balance clamps the same way); the DELTA may still be negative.
    targetBalance: z
      .number({ error: t('validation.enter', { field: t('reconcileAccount.balanceLabel') }) })
      .min(0, t('validation.mustBeNonNegative', { field: t('reconcileAccount.balanceLabel') })),
  })
}

export type ReconcileAccountFormValues = z.infer<ReturnType<typeof createReconcileAccountSchema>>
