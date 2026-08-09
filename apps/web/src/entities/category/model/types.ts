export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  /** Present only for the bundled default categories (localStorage mode); the
   * backend does not return a slug. */
  slug?: string
}
