import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { NotFoundError } from '../repository'
import { normalizeDebtor, type Debtor } from '../domain/debtor'
import type {
  CreateDebtorPayload,
  DebtorRepository,
  UpdateDebtorPayload,
} from '../repositories/debtor'

type ApiDebtor = components['schemas']['Debtor']
type DebtorCreateRequest = components['schemas']['DebtorCreateRequest']
type DebtorUpdateRequest = components['schemas']['DebtorUpdateRequest']

function toDebtor(value: ApiDebtor): Debtor | null {
  return normalizeDebtor(value)
}

function normalizeOrThrow(value: ApiDebtor): Debtor {
  const debtor = normalizeDebtor(value)
  if (!debtor) {
    throw new Error('Received a malformed debtor from the server')
  }
  return debtor
}

// The error middleware throws on every non-2xx response, so a resolved call
// always carries a body. This asserts that invariant for the type system.
function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

export function createHTTPDebtorRepository(client: ApiClient): DebtorRepository {
  return {
    async getAll() {
      const { data } = await client.GET('/api/debtors', { params: {} })
      return requireData(data).flatMap((value) => {
        const debtor = toDebtor(value)
        return debtor ? [debtor] : []
      })
    },
    async getById(id: string) {
      try {
        const { data } = await client.GET('/api/debtors/{id}', {
          params: { path: { id } },
        })
        return data ? normalizeOrThrow(data) : null
      } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
      }
    },
    async create(payload: CreateDebtorPayload) {
      const { data } = await client.POST('/api/debtors', {
        body: toCreateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async update(id, payload: UpdateDebtorPayload) {
      const { data } = await client.PATCH('/api/debtors/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async remove(id) {
      await client.DELETE('/api/debtors/{id}', { params: { path: { id } } })
    },
  }
}

function toCreateRequest(payload: CreateDebtorPayload): DebtorCreateRequest {
  return {
    name: payload.name,
    note: payload.note ?? '',
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
}

function toUpdateRequest(payload: UpdateDebtorPayload): DebtorUpdateRequest {
  return {
    version: payload.version,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.note !== undefined ? { note: payload.note } : {}),
  }
}
