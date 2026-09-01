import type { ApiClient } from '../api-client'
import type { components } from '../schema'
import { generateId } from '../lib/generate-id'
import { NotFoundError } from '../repository'
import { normalizeTransaction } from '../domain/transaction'
import type { Transaction } from '../domain/transaction'
import type {
  CreateTransactionPayload,
  TransactionPage,
  TransactionQuery,
  TransactionRepository,
  UpdateTransactionPayload,
} from '../repositories/transaction'
import type { CalendarDay } from '../lib/datetime'

type ApiTransaction = components['schemas']['Transaction']
type TransactionCreateRequest = components['schemas']['TransactionCreateRequest']
type TransactionUpdateRequest = components['schemas']['TransactionUpdateRequest']

const PAGE_SIZE = 100

const toDateParam = (day: CalendarDay | undefined): string | undefined =>
  day ? day.toString() : undefined

// Normalise every backend transaction into the frontend's discriminated union.
function toTransaction(value: ApiTransaction): Transaction | null {
  return normalizeTransaction(value)
}

function toTransactions(values: ApiTransaction[]): Transaction[] {
  return values.flatMap((value) => {
    const transaction = toTransaction(value)
    return transaction ? [transaction] : []
  })
}

// Build the query params the backend `listTransactions` expects.
function buildListParams(
  options: TransactionQuery & { cursor?: string },
): Record<string, string | undefined> {
  return {
    type: options.type,
    accountId: options.accountId,
    categoryId: options.categoryId,
    fromDate: toDateParam(options.fromDate),
    toDate: toDateParam(options.toDate),
    limit: options.limit?.toString(),
    cursor: options.cursor,
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

export function createHTTPTransactionRepository(client: ApiClient): TransactionRepository {
  const getById = async (id: string): Promise<Transaction | null> => {
    try {
      const { data } = await client.GET('/api/transactions/{id}', {
        params: { path: { id } },
      })
      return data ? toTransaction(data) : null
    } catch (error) {
      if (error instanceof NotFoundError) return null
      throw error
    }
  }

  const listPage = async (
    options: TransactionQuery & { cursor?: string } = {},
  ): Promise<TransactionPage> => {
    const { data } = await client.GET('/api/transactions', {
      params: { query: buildListParams(options) },
    })
    const body = requireData(data)
    return {
      transactions: toTransactions(body.transactions),
      nextCursor: body.nextCursor ?? null,
    }
  }

  // Follow the cursor to completion (the transactions list shows everything).
  const fetchAllPages = async (options: TransactionQuery): Promise<Transaction[]> => {
    const merged: Transaction[] = []
    let cursor: string | undefined
    // Safety cap so a misbehaving cursor can never spin forever.
    for (let page = 0; page < 1000; page++) {
      const result = await listPage({ ...options, cursor, limit: PAGE_SIZE })
      merged.push(...result.transactions)
      cursor = result.nextCursor ?? undefined
      if (!cursor) break
    }
    return merged
  }

  return {
    getAll: () => fetchAllPages({}),
    getById,
    async query(options: TransactionQuery = {}) {
      // A bounded query (e.g. recent transactions) maps to a single page so the
      // backend returns at most `limit` of the most recent items. Unbounded
      // queries (the full transactions list) follow the cursor to completion.
      if (options.limit !== undefined) {
        const page = await listPage(options)
        return page.transactions
      }
      return fetchAllPages(options)
    },
    listPage,
    async create(payload: CreateTransactionPayload) {
      const { data } = await client.POST('/api/transactions', {
        params: {
          // Idempotency-Key is required by the spec; generate a fresh UUID per
          // intent so retries with the same key replay the cached response.
          header: { 'Idempotency-Key': generateId() },
        },
        body: toCreateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async update(id, payload: UpdateTransactionPayload) {
      const { data } = await client.PATCH('/api/transactions/{id}', {
        params: { path: { id } },
        body: toUpdateRequest(payload),
      })
      return normalizeOrThrow(requireData(data))
    },
    async remove(id) {
      await client.DELETE('/api/transactions/{id}', { params: { path: { id } } })
    },
  }
}

function toCreateRequest(payload: CreateTransactionPayload): TransactionCreateRequest {
  const base = {
    type: payload.type,
    amount: payload.amount,
    occurredAt: payload.occurredAt,
    description: payload.description ?? '',
    ...(payload.id !== undefined ? { id: payload.id } : {}),
  }
  if (payload.type === 'transfer') {
    return { ...base, fromAccountId: payload.fromAccountId, toAccountId: payload.toAccountId }
  }
  if (payload.type === 'adjustment') {
    return { ...base, accountId: payload.accountId }
  }
  return { ...base, accountId: payload.accountId, categoryId: payload.categoryId }
}

function toUpdateRequest(payload: UpdateTransactionPayload): TransactionUpdateRequest {
  const result: TransactionUpdateRequest = { version: payload.version }
  if (payload.amount !== undefined) result.amount = payload.amount
  if (payload.description !== undefined) result.description = payload.description
  if (payload.occurredAt !== undefined) result.occurredAt = payload.occurredAt
  if ('accountId' in payload && payload.accountId) result.accountId = payload.accountId
  if ('categoryId' in payload && payload.categoryId) result.categoryId = payload.categoryId
  if ('fromAccountId' in payload && payload.fromAccountId) result.fromAccountId = payload.fromAccountId
  if ('toAccountId' in payload && payload.toAccountId) result.toAccountId = payload.toAccountId
  return result
}

function normalizeOrThrow(value: ApiTransaction): Transaction {
  const transaction = toTransaction(value)
  if (!transaction) {
    throw new Error('Received a malformed transaction from the server')
  }
  return transaction
}
