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
