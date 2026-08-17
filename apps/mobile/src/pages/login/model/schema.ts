import { z } from 'zod'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
// No email-format rule - none exists today (design D5 of the migration).
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Введите email'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
