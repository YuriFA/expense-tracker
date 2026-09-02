import type { Category } from '../domain/category'
import type { Repository } from '../repository'

export type CreateCategoryPayload = Omit<Category, 'id' | 'version' | 'archivedAt'> &
  Partial<Pick<Category, 'id'>>
export type UpdateCategoryPayload = Partial<Omit<Category, 'id' | 'version' | 'archivedAt'>> & {
  /** Optimistic-concurrency CAS token: the version the caller previously read. */
  version: number
  /** Archive (true, server stamps the moment) or unarchive (false); absent = unchanged. */
  archived?: boolean
}

export interface CategoryRepository extends Repository<Category, CreateCategoryPayload, UpdateCategoryPayload> {
  /** Active (non-archived) categories - the picker default. */
  getAll(): Promise<Category[]>
  /** All non-deleted categories, archived included - management UIs and
   * history joins over existing transactions. */
  getAllIncludingArchived(): Promise<Category[]>
  /** Tombstone the category. With `cascade: true` the referencing
   * transactions are tombstoned together with it (one atomic operation);
   * live planned payments block the delete in both modes. */
  remove(id: string, options?: { cascade?: boolean }): Promise<void>
}
