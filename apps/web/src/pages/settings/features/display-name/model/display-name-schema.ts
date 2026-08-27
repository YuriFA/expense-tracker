import { z } from 'zod'
import i18n from '@/shared/i18n'

/**
 * Form factory so messages re-resolve `t()` at form mount (vue-patterns §3).
 * The profile PATCH cannot reset the name to null in v1 - empty is invalid.
 */
export function createDisplayNameSchema() {
  return z.object({
    displayName: z
      .string()
      .trim()
      .min(1, i18n.global.t('profile.displayNameRequired'))
      .max(100, i18n.global.t('profile.displayNameTooLong')),
  })
}

export type DisplayNameFormValues = z.infer<ReturnType<typeof createDisplayNameSchema>>
