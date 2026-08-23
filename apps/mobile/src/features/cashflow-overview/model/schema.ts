import { z } from 'zod'
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from '@/entities/category'

// TODO(i18n): RU validation messages until mobile i18n wiring lands.
// type/icon/color always hold picker defaults, so they have no error path.
export const newCategorySchema = z.object({
  name: z.string().trim().min(1, 'Введите название категории'),
  type: z.enum(['expense', 'income']),
  icon: z.string(),
  color: z.string(),
})

export type NewCategoryFormValues = z.infer<typeof newCategorySchema>

export const newCategoryDefaultValues: NewCategoryFormValues = {
  name: '',
  type: 'expense',
  icon: DEFAULT_CATEGORY_ICON,
  color: DEFAULT_CATEGORY_COLOR,
}
