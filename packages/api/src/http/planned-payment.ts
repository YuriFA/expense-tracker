import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { NotFoundError } from '../repository'
import {
  normalizePlannedPayment,
  type PlannedPayment,
} from '../domain/planned_payment'
import type {
  CreatePlannedPaymentPayload,
  PlannedPaymentQuery,
  PlannedPaymentRepository,
  UpdatePlannedPaymentPayload,
} from '../repositories/planned-payment'

type ApiPlannedPayment = components['schemas']['PlannedPayment']
type PlannedPaymentCreateRequest = components['schemas']['PlannedPaymentCreateRequest']
type PlannedPaymentUpdateRequest = components['schemas']['PlannedPaymentUpdateRequest']

// Normalise every backend plan; malformed rows are dropped.
function toPlannedPayment(value: ApiPlannedPayment): PlannedPayment | null {
  return normalizePlannedPayment(value)
}

function normalizeOrThrow(value: ApiPlannedPayment): PlannedPayment {
  const plan = normalizePlannedPayment(value)
  if (!plan) {
    throw new Error('Received a malformed planned payment from the server')
  }
  return plan
}

// The error middleware throws on every non-2xx response, so a resolved call
// always carries a body. This asserts that invariant for the type system.
function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

export function createHTTPPlannedPaymentRepository(
  client: ApiClient,
): PlannedPaymentRepository {
  return {
    async getAll() {
      const { data } = await client.GET('/api/planned-payments', { params: {} })
      return requireData(data).flatMap((value) => {
        const plan = toPlannedPayment(value)
        return plan ? [plan] : []
      })
    },
    async getById(id: string) {
      try {
        const { data } = await client.GET('/api/planned-payments/{id}', {
          params: { path: { id } },
        })
        return data ? normalizeOrThrow(data) : null
      } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
      }
    },
    async query(options: PlannedPaymentQuery = {}) {
      const { data } = await client.GET('/api/planned-payments', {
        params: { query: { type: options.type } },
      })
      return requireData(data).flatMap((value) => {
        const plan = toPlannedPayment(value)
        return plan ? [plan] : []
      })
    },
    async create(payload: CreatePlannedPaymentPayload) {
      const { data } = await client.POST('/api/planned-payments', {
        body: toCreateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async update(id, payload: UpdatePlannedPaymentPayload) {
      const { data } = await client.PATCH('/api/planned-payments/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async remove(id) {
      await client.DELETE('/api/planned-payments/{id}', { params: { path: { id } } })
    },
  }
}

function toCreateRequest(
  payload: CreatePlannedPaymentPayload,
): PlannedPaymentCreateRequest {
  return {
    type: payload.type,
    amount: payload.amount,
    accountId: payload.accountId,
    categoryId: payload.categoryId,
    nextDue: payload.nextDue,
    regularity: payload.regularity,
    confirmMode: payload.confirmMode,
    reminder: payload.reminder,
    name: payload.name ?? '',
    note: payload.note ?? '',
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
}

function toUpdateRequest(
  payload: UpdatePlannedPaymentPayload,
): PlannedPaymentUpdateRequest {
  return {
    version: payload.version,
    ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.note !== undefined ? { note: payload.note } : {}),
    ...(payload.accountId !== undefined ? { accountId: payload.accountId } : {}),
    ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
    ...(payload.nextDue !== undefined ? { nextDue: payload.nextDue } : {}),
    ...(payload.regularity !== undefined ? { regularity: payload.regularity } : {}),
    ...(payload.confirmMode !== undefined
      ? { confirmMode: payload.confirmMode }
      : {}),
    ...(payload.reminder !== undefined ? { reminder: payload.reminder } : {}),
  }
}
