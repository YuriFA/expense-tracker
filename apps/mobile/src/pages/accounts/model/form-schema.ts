import { z } from 'zod'
import type { TFunction } from 'i18next'
import { AVAILABLE_CURRENCIES, type CurrencyCode } from '@expense-tracker/money'
import { parseNonNegativeMinor, parseSignedMinor } from './balance'

/**
 * Zod form schemas for the account create / edit sheets.
 *
 * These mirror the `@expense-tracker/api` payload contracts:
 *  - `CreateAccountPayload`: { name, currency, openingBalance (minor units) }
 *  - `UpdateAccountPayload`: { name?, manualAdjustment?, ... } (currency immutable)
 *
 * The amount fields stay as the raw editable strings the user types (the form
 * value type is the *input* shape); they are validated in place and parsed to
 * integer minor units in the submit handler. Keeping them as strings avoids the
 * zod input/output type split that `.transform` would introduce against
 * react-hook-form's `defaultValues`. Money is minor-units everywhere downstream.
 *
 * The opening balance is non-negative (mirrors the web Zod schema); the
 * edit-time balance correction is signed (an account may be overdrawn).
 * Messages reuse the shared `validation.*` keys.
 */

const currencyValues = AVAILABLE_CURRENCIES as [CurrencyCode, ...CurrencyCode[]]

export function createAccountSchema(t: TFunction) {
  return z.object({
    name: z
      .string({ error: t('validation.enter', { field: t('addAccount.nameLabel') }) })
      .trim()
      .min(1, t('validation.enter', { field: t('addAccount.nameLabel') })),
    currency: z.enum(currencyValues),
    opening: z.string().refine(
      (value) => value.trim() === '' || parseNonNegativeMinor(value) !== null,
      t('validation.mustBeNonNegative', { field: t('addAccount.openingBalanceLabel') }),
    ),
  })
}
export type CreateAccountValues = z.infer<ReturnType<typeof createAccountSchema>>

export function editAccountSchema(t: TFunction) {
  return z.object({
    name: z
      .string({ error: t('validation.enter', { field: t('editAccount.nameLabel') }) })
      .trim()
      .min(1, t('validation.enter', { field: t('editAccount.nameLabel') })),
    balance: z
      .string()
      .refine(
        (value) => parseSignedMinor(value) !== null,
        t('validation.enter', { field: t('editAccount.openingBalanceLabel') }),
      ),
  })
}
export type EditAccountValues = z.infer<ReturnType<typeof editAccountSchema>>
