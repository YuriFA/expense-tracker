import { z } from 'zod'
import i18n from '@/shared/i18n'

/** Form factory so messages re-resolve `t()` at form mount (vue-patterns §3). */
export function createInviteMemberSchema() {
  return z.object({
    email: z.string().trim().email(i18n.global.t('household.inviteEmailInvalid')),
  })
}

export type InviteMemberFormValues = z.infer<ReturnType<typeof createInviteMemberSchema>>
