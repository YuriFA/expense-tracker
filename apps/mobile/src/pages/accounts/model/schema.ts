import { z } from 'zod'
import { AVAILABLE_CURRENCIES } from '@expense-tracker/money'
import { parseMajorUnitsToMinor } from '@/shared/lib/money/parse'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
// The currency set is @expense-tracker/money's canonical AVAILABLE_CURRENCIES;
// always set from the button row, so it has no error path.
export const newAccountSchema = z.object({
  name: z.string().trim().min(1, 'Введите название счёта'),
  currency: z.enum(AVAILABLE_CURRENCIES),
  openingBalance: z
    .string()
    .refine((value) => parseMajorUnitsToMinor(value) !== null, 'Некорректная сумма'),
})

export type NewAccountFormValues = z.infer<typeof newAccountSchema>
