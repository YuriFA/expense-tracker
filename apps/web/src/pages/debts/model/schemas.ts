// Zod schema factories for the debts dialogs (validation messages resolve
// `t()` at form mount - web form convention 3). Amount is majors inside the
// form and converts to minor units exactly once in the submit handler.

import z from 'zod'
import i18n from '@/shared/i18n'

export const createOperationSchema = () => {
  const { t } = i18n.global
  return z.object({
    kind: z.enum(['debt', 'repayment']),
    amount: z
      .number({ error: t('validation.enter', { field: t('fields.amount') }) })
      .positive(t('validation.mustBePositive', { field: t('fields.amount') })),
    occurredAt: z.string().min(1, t('validation.select', { field: t('fields.date') })),
    note: z.string(),
  })
}
export type OperationFormValues = z.infer<ReturnType<typeof createOperationSchema>>

export const createDebtorDebtSchema = () => {
  const { t } = i18n.global
  return z.object({
    name: z.string().trim().min(1, t('validation.enter', { field: t('fields.name') })),
    amount: z
      .number({ error: t('validation.enter', { field: t('fields.amount') }) })
      .positive(t('validation.mustBePositive', { field: t('fields.amount') })),
    occurredAt: z.string().min(1, t('validation.select', { field: t('fields.date') })),
    note: z.string(),
  })
}
export type DebtorDebtFormValues = z.infer<ReturnType<typeof createDebtorDebtSchema>>

export const createDebtorSchema = () => {
  const { t } = i18n.global
  return z.object({
    name: z.string().trim().min(1, t('validation.enter', { field: t('fields.name') })),
    note: z.string(),
  })
}
export type DebtorFormValues = z.infer<ReturnType<typeof createDebtorSchema>>
