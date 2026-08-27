import { z } from 'zod'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
// The app is ruble-only (openspec app-currency): the form offers no currency
// choice and the submit mapper hardcodes RUB, so the schema has no currency
// field at all.
export const newAccountSchema = z.object({
  name: z.string().trim().min(1, 'Введите название счёта'),
  openingBalance: z
    .string()
    .refine((value) => parseMajorUnitsToMinor(value) !== null, 'Некорректная сумма'),
})

export type NewAccountFormValues = z.infer<typeof newAccountSchema>
