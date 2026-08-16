import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { NotFoundError } from '../repository'
import type { AccountWithBalance } from '../domain/account'
import type {
  AccountRepository,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '../repositories/account'

type ApiAccount = components['schemas']['Account']
type AccountCreateRequest = components['schemas']['AccountCreateRequest']
type AccountUpdateRequest = components['schemas']['AccountUpdateRequest']

function toAccountWithBalance(value: ApiAccount): AccountWithBalance {
  return {
    id: value.id,
    name: value.name,
    currency: value.currency,
    openingBalance: value.openingBalance,
    manualAdjustment: value.manualAdjustment,
    version: value.version,
    balance: value.balance,
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

export function createHTTPAccountRepository(client: ApiClient): AccountRepository {
  return {
    async getAll() {
      const { data } = await client.GET('/api/accounts')
      return requireData(data).map(toAccountWithBalance)
    },
    async getById(id: string) {
      try {
        const { data } = await client.GET('/api/accounts/{id}', { params: { path: { id } } })
        return data ? toAccountWithBalance(data) : null
      } catch (error) {
        if (error instanceof NotFoundError) return null
        throw error
      }
    },
    async create(payload: CreateAccountPayload) {
      const { data } = await client.POST('/api/accounts', {
        body: toCreateRequest(payload),
      })
      return toAccountWithBalance(requireData(data))
    },
    async update(id, payload: UpdateAccountPayload) {
      const { data } = await client.PATCH('/api/accounts/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return toAccountWithBalance(requireData(data))
    },
    async remove(id) {
      await client.DELETE('/api/accounts/{id}', { params: { path: { id } } })
    },
  }
}

function toCreateRequest(payload: CreateAccountPayload): AccountCreateRequest {
  return {
    name: payload.name,
    currency: payload.currency,
    openingBalance: payload.openingBalance,
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
}

function toUpdateRequest(payload: UpdateAccountPayload): AccountUpdateRequest {
  return {
    version: payload.version,
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.manualAdjustment !== undefined
      ? { manualAdjustment: payload.manualAdjustment }
      : {}),
  }
}
