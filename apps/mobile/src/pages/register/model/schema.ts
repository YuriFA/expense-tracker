import { z } from 'zod'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
export const MIN_PASSWORD_LENGTH = 8

export const registerSchema = z
  .object({
    email: z.string().trim().min(1, 'Введите email'),
    password: z
      .string()
      .min(1, 'Введите пароль')
      .min(MIN_PASSWORD_LENGTH, `Пароль должен содержать минимум ${MIN_PASSWORD_LENGTH} символов`),
    confirmPassword: z.string().min(1, 'Введите пароль ещё раз'),
  })
  .refine((values) => values.confirmPassword === values.password, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  })

export type RegisterFormValues = z.infer<typeof registerSchema>
