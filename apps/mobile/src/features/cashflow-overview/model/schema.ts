import { z } from 'zod'
import { defaultCategoryIcon } from '@/entities/category'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
// type/icon always hold picker defaults, so they have no error path.
export const newCategorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название категории'),
  type: z.enum(['expense', 'income']),
  icon: z.string(),
})

export type NewCategoryFormValues = z.infer<typeof newCategorySchema>

export const newCategoryDefaultValues: NewCategoryFormValues = {
  name: '',
  type: 'expense',
  icon: defaultCategoryIcon('expense'),
}
