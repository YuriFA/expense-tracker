import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { NotFoundError } from '../repository'
import type { Category } from '../domain/category'
import type {
  CategoryRepository,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../repositories/category'

type ApiCategory = components['schemas']['Category']
type CategoryCreateRequest = components['schemas']['CategoryCreateRequest']
type CategoryUpdateRequest = components['schemas']['CategoryUpdateRequest']

function toCategory(value: ApiCategory): Category {
  // The backend does not return a `slug`; categories display their server name.
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    icon: value.icon,
    color: value.color,
    archivedAt: value.archivedAt ?? null,
    version: value.version,
  }
}

// The error middleware throws on every non-2xx response, so a resolved call
// always carries a body. This asserts that invariant for the type system.
function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

export function createHTTPCategoryRepository(client: ApiClient): CategoryRepository {
  return {
    async getAll() {
      const { data } = await client.GET('/api/categories', { params: {} })
      return requireData(data).map(toCategory)
    },
    async getAllIncludingArchived() {
      const { data } = await client.GET('/api/categories', {
        params: { query: { includeArchived: true } },
      })
      return requireData(data).map(toCategory)
    },
    async getById(id: string) {
      try {
        const { data } = await client.GET('/api/categories/{id}', {
          params: { path: { id } },
        })
        return data ? toCategory(data) : null
      } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
      }
    },
    async create(payload: CreateCategoryPayload) {
      const { data } = await client.POST('/api/categories', {
        body: toCreateRequest(payload),
      })
      return toCategory(requireData(data))
    },
    async update(id, payload: UpdateCategoryPayload) {
      const { data } = await client.PATCH('/api/categories/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return toCategory(requireData(data))
    },
    async remove(id, options) {
      await client.DELETE('/api/categories/{id}', {
        params: {
          path: { id },
          ...(options?.cascade ? { query: { cascade: true } } : {}),
        },
      })
    },
  }
}

function toCreateRequest(payload: CreateCategoryPayload): CategoryCreateRequest {
  return {
    name: payload.name,
    type: payload.type,
    icon: payload.icon,
    color: payload.color,
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
}

function toUpdateRequest(payload: UpdateCategoryPayload): CategoryUpdateRequest {
  return {
    version: payload.version,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
    ...(payload.color !== undefined ? { color: payload.color } : {}),
    ...(payload.archived !== undefined ? { archived: payload.archived } : {}),
  }
}
