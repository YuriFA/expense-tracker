import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { components } from '@/shared/api/schema'
import { NotFoundError, VersionConflictError } from '@/shared/lib/data'
import { createHTTPTransactionRepository } from './http-repository'

type ApiTransaction = components['schemas']['Transaction']

const apiTransaction: ApiTransaction = {
  id: 't1',
  userId: 'u1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
  fromAccountId: null,
  toAccountId: null,
  version: 1,
}

function jsonResponse(status: number, body: unknown): Response {
  if (status === 204) {
    return new Response(null, { status: 204 })
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// openapi-fetch issues a `Request` object; extract URL/method/headers from it.
function inspect(call: [input: RequestInfo | URL, init?: RequestInit] | undefined) {
  const [input, init] = call!
  const request = input instanceof Request ? input : { url: String(input), method: 'GET', headers: new Headers() }
  return {
    url: new URL(request.url),
    method: init?.method ?? request.method ?? 'GET',
    headers: init?.headers ?? request.headers,
  }
}

describe('transaction HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('follows the cursor to fetch every page', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          jsonResponse(200, { transactions: [apiTransaction], nextCursor: 'c2' }),
        )
        .mockResolvedValueOnce(jsonResponse(200, { transactions: [], nextCursor: null }))

      const repo = createHTTPTransactionRepository()
      const result = await repo.getAll()

      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe('t1')
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(inspect(fetchSpy.mock.calls[1]).url.searchParams.get('cursor')).toBe('c2')
    })
  })

  describe('getById', () => {
    it('calls GET /transactions/{id}', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, apiTransaction))
      const repo = createHTTPTransactionRepository()
      const result = await repo.getById('t1')
      expect(result?.id).toBe('t1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/transactions/t1')
      expect(call.method).toBe('GET')
    })

    it('returns null on 404', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(404, { code: 'TRANSACTION_NOT_FOUND', message: 'not found' }),
      )
      const repo = createHTTPTransactionRepository()
      const result = await repo.getById('missing')
      expect(result).toBeNull()
    })
  })

  describe('query', () => {
    it('serializes filters and uses a single page when limit is set', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { transactions: [], nextCursor: null }))
      const repo = createHTTPTransactionRepository()
      await repo.query({ limit: 5, type: 'income', accountId: 'a1', categoryId: 'cincome' })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.searchParams.get('limit')).toBe('5')
      expect(call.url.searchParams.get('type')).toBe('income')
      expect(call.url.searchParams.get('accountId')).toBe('a1')
      expect(call.url.searchParams.get('categoryId')).toBe('cincome')
      expect(call.method).toBe('GET')
    })

    it('auto-paginates when no limit is set', async () => {
      fetchSpy
        .mockResolvedValueOnce(jsonResponse(200, { transactions: [apiTransaction], nextCursor: 'x' }))
        .mockResolvedValueOnce(jsonResponse(200, { transactions: [], nextCursor: null }))
      const repo = createHTTPTransactionRepository()
      const result = await repo.query({})
      expect(result).toHaveLength(1)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('create', () => {
    it('sends POST with an Idempotency-Key header', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(201, apiTransaction))
      const repo = createHTTPTransactionRepository()
      const result = await repo.create({
        type: 'income',
        amount: 100,
        description: '',
        occurredAt: '2024-01-15T10:00:00Z',
        accountId: 'a1',
        categoryId: 'cincome',
      })
      expect(result.id).toBe('t1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/transactions')
      expect(call.method).toBe('POST')
      expect(new Headers(call.headers).get('Idempotency-Key')).toBeTruthy()
    })
  })

  describe('update', () => {
    it('sends PATCH (not PUT) with the version field', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(200, { ...apiTransaction, amount: 200, version: 2 }),
      )
      const repo = createHTTPTransactionRepository()
      const result = await repo.update('t1', { version: 1, amount: 200 })
      expect(result.amount).toBe(200)
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/transactions/t1')
      expect(call.method).toBe('PATCH')
      const body = await (fetchSpy.mock.calls[0]![0] as Request).clone().json()
      expect(body).toEqual({ version: 1, amount: 200 })
    })

    it('maps a 409 TRANSACTION_VERSION_CONFLICT to VersionConflictError', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(409, {
          code: 'TRANSACTION_VERSION_CONFLICT',
          message: 'version conflict',
        }),
      )
      const repo = createHTTPTransactionRepository()
      await expect(repo.update('t1', { version: 1, amount: 200 })).rejects.toBeInstanceOf(
        VersionConflictError,
      )
    })

    it('maps a 404 TRANSACTION_NOT_FOUND to NotFoundError', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(404, { code: 'TRANSACTION_NOT_FOUND', message: 'not found' }),
      )
      const repo = createHTTPTransactionRepository()
      await expect(repo.update('missing', { version: 1, amount: 200 })).rejects.toBeInstanceOf(
        NotFoundError,
      )
    })
  })

  describe('remove', () => {
    it('calls DELETE /transactions/{id}', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(204, null))
      const repo = createHTTPTransactionRepository()
      await repo.remove('t1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/transactions/t1')
      expect(call.method).toBe('DELETE')
    })
  })
})
