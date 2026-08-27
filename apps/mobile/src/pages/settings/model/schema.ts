import { z } from 'zod'

// The household home-code alphabet excludes the ambiguous glyphs (no 0/O,
// no 1/I - household-join design D2). The input normalizes to uppercase
// while typing; the schema only validates the exact shape, never converts.
// TODO(i18n): RU validation messages until mobile i18n wiring lands.
export const joinByCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/, 'Код — 8 символов (без 0, O, 1 и I)'),
})

export type JoinByCodeFormValues = z.infer<typeof joinByCodeSchema>

// Invitation email (household-ux 2.2): the contract's `format: email`. The
// schema only validates; submission sends the trimmed value.
export const inviteMemberSchema = z.object({
  email: z.string().trim().email('Введите корректный email'),
})

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>

// Household display name (household-ux 2.2): 1-100 chars per the contract;
// an empty submission CLEARS the name (null reset is part of PATCH).
export const householdNameSchema = z.object({
  name: z.string().trim().max(100, 'Не больше 100 символов'),
})

export type HouseholdNameFormValues = z.infer<typeof householdNameSchema>

// The user's own display name (household-ux 2.5): the profile PATCH cannot
// reset to null in v1, so an empty value is invalid, not a reset.
export const displayNameSchema = z.object({
  displayName: z.string().trim().min(1, 'Введите имя').max(100, 'Имя не длиннее 100 символов'),
})

export type DisplayNameFormValues = z.infer<typeof displayNameSchema>
