import { z } from 'zod'
import type { TFunction } from 'i18next'
import { parseAmountToMinor } from '@shared/lib/amount'

/**
 * Zod form schema for the transaction-edit sheet.
 *
 * Mirrors `UpdateTransactionPayload` (PATCH requires `version`, supplied from
 * the loaded transaction at submit time). The transaction type is fixed (changing
 * it is a delete+create, not an edit), so this schema carries every selector and
 * the submit handler picks the cashflow vs transfer subset. `version` is
 * deliberately NOT part of the form values - it is read from the transaction and
 * merged into the payload on submit (never pushed into a create payload).
 *
 * The amount is the raw editable string, validated to parse to positive minor
 * units. Account/category presence + cross-currency checks depend on the loaded
 * accounts list, so they stay as derived `canSave` gates in the component (as
 * before the migration) rather than zod refinements.
 */
export function transactionEditSchema(t: TFunction) {
  return z.object({
    amount: z
      .string()
      .refine(
        (value) => parseAmountToMinor(value) !== null,
        t('validation.mustBePositive', { field: t('fields.amount') }),
      ),
    description: z.string(),
    accountId: z.string().nullable(),
    categoryId: z.string().nullable(),
    fromAccountId: z.string().nullable(),
    toAccountId: z.string().nullable(),
  })
}
export type TransactionEditValues = z.infer<ReturnType<typeof transactionEditSchema>>
