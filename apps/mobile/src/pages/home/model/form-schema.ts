import { z } from 'zod'
import type { TFunction } from 'i18next'
import type { AccountWithBalance, TransactionType } from '@expense-tracker/api'
import { parseAmountToMinor } from '@shared/lib/amount'

const transactionTypeValues = ['expense', 'income', 'transfer'] as [
  TransactionType,
  ...TransactionType[],
]

/**
 * Zod form schema for the Home add-transaction screen.
 *
 * This schema owns EVERY save rule, so `formState.isValid` IS the save gate -
 * no hand-rolled `canSave` derivation, no per-field `useWatch` on the page:
 *  - `amountText` (the raw editable string the hero `AmountField` owns) parses
 *    to positive minor units (parsed to minor units in the submit handler; no
 *    `.transform`, which would split input/output typing against `defaultValues`).
 *  - cashflow: account + category present.
 *  - transfer: From + To present, distinct, same currency (no FX at this stage).
 *
 * The transfer From/To errors also drive the live caption under the hero amount
 * (read from `errors.fromAccountId`), so the cross-currency / same-account check
 * lives in exactly one place. `version` is deliberately NOT part of the form
 * values (this is a create surface; the `transactions.version` NOT NULL
 * invariant). Accounts are captured at mount - the form only mounts once the
 * reference data has loaded.
 */
export function homeFormSchema(t: TFunction, accounts: AccountWithBalance[]) {
  return z
    .object({
      type: z.enum(transactionTypeValues),
      amountText: z.string(),
      accountId: z.string().nullable(),
      categoryId: z.string().nullable(),
      fromAccountId: z.string().nullable(),
      toAccountId: z.string().nullable(),
      date: z.date(),
    })
    .superRefine((values, ctx) => {
      if (parseAmountToMinor(values.amountText) === null) {
        ctx.addIssue({
          code: 'custom',
          path: ['amountText'],
          message: t('validation.mustBePositive', { field: t('fields.amount') }),
        })
      }

      if (values.type === 'transfer') {
        if (!values.fromAccountId) {
          ctx.addIssue({
            code: 'custom',
            path: ['fromAccountId'],
            message: t('validation.select', { field: t('addTransfer.fromAccountLabel') }),
          })
        }
        if (!values.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            path: ['toAccountId'],
            message: t('validation.select', { field: t('addTransfer.toAccountLabel') }),
          })
        }
        if (values.fromAccountId && values.toAccountId && values.fromAccountId === values.toAccountId) {
          ctx.addIssue({
            code: 'custom',
            path: ['fromAccountId'],
            message: t('validation.transferAccountsMustDiffer'),
          })
        }
        const from = accounts.find((account) => account.id === values.fromAccountId)
        const to = accounts.find((account) => account.id === values.toAccountId)
        if (from && to && from.currency !== to.currency) {
          ctx.addIssue({
            code: 'custom',
            path: ['fromAccountId'],
            message: t('validation.transferAccountsMustMatchCurrency'),
          })
        }
      } else {
        if (!values.accountId) {
          ctx.addIssue({
            code: 'custom',
            path: ['accountId'],
            message: t('validation.select', { field: t('fields.account') }),
          })
        }
        if (!values.categoryId) {
          ctx.addIssue({
            code: 'custom',
            path: ['categoryId'],
            message: t('validation.select', { field: t('fields.category') }),
          })
        }
      }
    })
}

export type HomeFormValues = z.infer<ReturnType<typeof homeFormSchema>>
