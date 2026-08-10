import {
  type Category,
  type CategoryRepository,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  NotFoundError,
  ReferentialIntegrityError,
  generateId,
} from '@expense-tracker/api'
import type { Database } from '@shared/services/database'

interface CategoryRow {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string
  color: string
  slug: string | null
}

interface Dependencies {
  /** Whether any transaction references the category (drives 409 *_IN_USE). */
  hasTransactionsForCategory: (categoryId: string) => Promise<boolean>
}

function rowToCategory(row: CategoryRow): Category {
  const base = {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
  }
  return row.slug ? { ...base, slug: row.slug } : base
}

/**
 * SQLite-backed `CategoryRepository`. The bundled default categories are seeded
 * into the table on first DB open (`services/database`); display names localize
 * via the shared `mapCategories` helper at the feature layer.
 */
export function createSQLiteCategoryRepository(
  db: Database,
  deps: Dependencies,
): CategoryRepository {
  return {
    async getAll(): Promise<Category[]> {
      const rows = await db.getAllAsync<CategoryRow>('SELECT * FROM categories')
      return rows.map(rowToCategory)
    },

    async getById(id: string): Promise<Category | null> {
      const row = await db.getFirstAsync<CategoryRow>(
        'SELECT * FROM categories WHERE id = ?',
        id,
      )
      return row ? rowToCategory(row) : null
    },

    async create(payload: CreateCategoryPayload): Promise<Category> {
      const id = payload.id ?? generateId()
      const category: Category = {
        id,
        name: payload.name,
        type: payload.type,
        icon: payload.icon,
        color: payload.color,
        ...(payload.slug ? { slug: payload.slug } : {}),
      }
      await db.runAsync(
        /* sql */ `INSERT INTO categories (id, name, type, icon, color, slug)
                   VALUES (?, ?, ?, ?, ?, ?)`,
        category.id,
        category.name,
        category.type,
        category.icon,
        category.color,
        category.slug ?? null,
      )
      return category
    },

    async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
      const existing = await db.getFirstAsync<CategoryRow>(
        'SELECT * FROM categories WHERE id = ?',
        id,
      )
      if (!existing) {
        throw new NotFoundError('Category not found')
      }

      const category = rowToCategory(existing)
      const updated: Category = {
        id: category.id,
        name: payload.name ?? category.name,
        type: payload.type ?? category.type,
        icon: payload.icon ?? category.icon,
        color: payload.color ?? category.color,
        slug: payload.slug ?? category.slug,
      }

      await db.runAsync(
        /* sql */ `UPDATE categories
                   SET name = ?, type = ?, icon = ?, color = ?, slug = ?
                   WHERE id = ?`,
        updated.name,
        updated.type,
        updated.icon,
        updated.color,
        updated.slug ?? null,
        id,
      )
      return updated
    },

    async remove(id: string): Promise<void> {
      if (await deps.hasTransactionsForCategory(id)) {
        throw new ReferentialIntegrityError('Category has referencing transactions')
      }
      const result = await db.runAsync('DELETE FROM categories WHERE id = ?', id)
      if (result.changes === 0) {
        throw new NotFoundError('Category not found')
      }
    },
  }
}
