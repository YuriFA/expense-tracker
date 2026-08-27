import z from 'zod'
import i18n from '@/shared/i18n'

// The home-code alphabet (household-join design D2): 8 characters from the
// unambiguous set (no 0/O/1/I). Input is trimmed and uppercased before the
// pattern check, so typing is forgiving.
export const HOUSEHOLD_CODE_PATTERN = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/

export const createJoinByCodeSchema = () => {
  const { t } = i18n.global

  return z.object({
    code: z
      .string({ error: t('validation.enter', { field: t('household.codeLabel') }) })
      .trim()
      .toUpperCase()
      .regex(HOUSEHOLD_CODE_PATTERN, t('household.errors.codeInvalid')),
  })
}

export type JoinByCodeFormValues = z.infer<ReturnType<typeof createJoinByCodeSchema>>
