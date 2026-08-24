import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { NotFoundError } from '../repository'
import { normalizeDebtOperation, type DebtOperation } from '../domain/debt-operation'
import type {
  CreateDebtOperationPayload,
  DebtOperationQuery,
  DebtOperationRepository,
  UpdateDebtOperationPayload,
} from '../repositories/debt-operation'

type ApiDebtOperation = components['schemas']['DebtOperation']
type DebtOperationCreateRequest = components['schemas']['DebtOperationCreateRequest']
type DebtOperationUpdateRequest = components['schemas']['DebtOperationUpdateRequest']

// Normalise every backend debt operation; malformed rows are dropped.
function toDebtOperation(value: ApiDebtOperation): DebtOperation | null {
  return normalizeDebtOperation(value)
}

function normalizeOrThrow(value: ApiDebtOperation): DebtOperation {
  const operation = normalizeDebtOperation(value)
  if (!operation) {
    throw new Error('Received a malformed debt operation from the server')
  }
  return operation
}

// The error middleware throws on every non-2xx response, so a resolved call
// always carries a body. This asserts that invariant for the type system.
function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

export function createHTTPDebtOperationRepository(client: ApiClient): DebtOperationRepository {
  return {
    async getAll() {
      const { data } = await client.GET('/api/debt-operations', { params: {} })
      return requireData(data).flatMap((value) => {
        const operation = toDebtOperation(value)
        return operation ? [operation] : []
      })
    },
    async getById(id: string) {
      try {
        const { data } = await client.GET('/api/debt-operations/{id}', {
          params: { path: { id } },
        })
        return data ? normalizeOrThrow(data) : null
      } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
      }
    },
    async query(options: DebtOperationQuery = {}) {
      const { data } = await client.GET('/api/debt-operations', {
        params: { query: { debtorId: options.debtorId } },
      })
      return requireData(data).flatMap((value) => {
        const operation = toDebtOperation(value)
        return operation ? [operation] : []
      })
    },
    async create(payload: CreateDebtOperationPayload) {
      const { data } = await client.POST('/api/debt-operations', {
        body: toCreateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async update(id, payload: UpdateDebtOperationPayload) {
      const { data } = await client.PATCH('/api/debt-operations/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async remove(id) {
      await client.DELETE('/api/debt-operations/{id}', { params: { path: { id } } })
    },
  }
}

function toCreateRequest(payload: CreateDebtOperationPayload): DebtOperationCreateRequest {
  return {
    debtorId: payload.debtorId,
    direction: payload.direction,
    kind: payload.kind,
    amount: payload.amount,
    note: payload.note ?? '',
    occurredAt: payload.occurredAt,
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
}

function toUpdateRequest(payload: UpdateDebtOperationPayload): DebtOperationUpdateRequest {
  return {
    version: payload.version,
    ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
    ...(payload.note !== undefined ? { note: payload.note } : {}),
    ...(payload.occurredAt !== undefined ? { occurredAt: payload.occurredAt } : {}),
  }
}
