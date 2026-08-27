import { z } from 'zod'
import i18n from '@/shared/i18n'

/** Form factory so messages re-resolve `t()` at form mount (vue-patterns §3). */
export function createRenameHouseholdSchema() {
  return z.object({
    // Empty (after trim) clears the name (PATCH name: null); otherwise 1-100.
    name: z.string().trim().max(100, i18n.global.t('profile.displayNameTooLong')),
  })
}

export type RenameHouseholdFormValues = z.infer<ReturnType<typeof createRenameHouseholdSchema>>
