import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { CashflowTransaction } from '../model/types'
import { createHTTPTransactionRepository } from './http-repository'

const transactionFixture: CashflowTransaction = {
  id: 't1',
  type: 'income',
  amount: 100,
  description: '',
  occurredAt: '2024-01-15T10:00:00Z',
  accountId: 'a1',
  categoryId: 'cincome',
}

function mockJsonResponse(status: number, body: unknown) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

describe('transaction HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('calls GET /transactions and returns parsed array', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, [transactionFixture]))
      const repo = createHTTPTransactionRepository()
      const result = await repo.getAll()
      expect(result).toEqual([transactionFixture])
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('getById', () => {
    it('calls GET /transactions/:id and returns transaction', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, transactionFixture))
      const repo = createHTTPTransactionRepository()
      const result = await repo.getById('t1')
      expect(result).toEqual(transactionFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions\/t1(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('query', () => {
    it('calls GET /transactions without query params when options empty', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, [transactionFixture]))
      const repo = createHTTPTransactionRepository()
      const result = await repo.query({})
      expect(result).toEqual([transactionFixture])
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions(\?[^/]*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })

    it('serializes filters into query string', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, [transactionFixture]))
      const repo = createHTTPTransactionRepository()
      await repo.query({
        limit: 10,
        type: 'income',
        accountId: 'a1',
        categoryId: 'cincome',
        fromDate: '2024-01-01' as never,
        toDate: '2024-01-31' as never,
      })
      const [url] = fetchSpy.mock.calls[0]!
      const parsed = new URL(String(url))
      expect(parsed.searchParams.get('limit')).toBe('10')
      expect(parsed.searchParams.get('type')).toBe('income')
      expect(parsed.searchParams.get('accountId')).toBe('a1')
      expect(parsed.searchParams.get('categoryId')).toBe('cincome')
      expect(parsed.searchParams.get('fromDate')).toBe('2024-01-01')
      expect(parsed.searchParams.get('toDate')).toBe('2024-01-31')
    })

    it('omits undefined filters from query string', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, []))
      const repo = createHTTPTransactionRepository()
      await repo.query({ type: 'expense' })
      const [url] = fetchSpy.mock.calls[0]!
      const parsed = new URL(String(url))
      expect(parsed.searchParams.get('type')).toBe('expense')
      expect(parsed.searchParams.has('limit')).toBe(false)
      expect(parsed.searchParams.has('accountId')).toBe(false)
    })
  })

  describe('hasTransactionsForAccount', () => {
    it('calls GET /accounts/:id/has-transactions and returns boolean', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, true))
      const repo = createHTTPTransactionRepository()
      const result = await repo.hasTransactionsForAccount('a1')
      expect(result).toBe(true)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts\/a1\/has-transactions(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('hasTransactionsForCategory', () => {
    it('calls GET /categories/:id/has-transactions and returns boolean', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, false))
      const repo = createHTTPTransactionRepository()
      const result = await repo.hasTransactionsForCategory('c1')
      expect(result).toBe(false)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories\/c1\/has-transactions(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('create', () => {
    it('calls POST /transactions with JSON body and returns created transaction', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(201, transactionFixture))
      const repo = createHTTPTransactionRepository()
      const { id: _omit, ...payload } = transactionFixture
      const result = await repo.create(payload as never)
      expect(result).toEqual(transactionFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions(\?.*)?$/)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('update', () => {
    it('calls PUT /transactions/:id with JSON body and returns updated transaction', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, transactionFixture))
      const repo = createHTTPTransactionRepository()
      const payload = { amount: 200 }
      const result = await repo.update('t1', payload)
      expect(result).toEqual(transactionFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions\/t1(\?.*)?$/)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('remove', () => {
    it('calls DELETE /transactions/:id', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, null))
      const repo = createHTTPTransactionRepository()
      await repo.remove('t1')
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/transactions\/t1(\?.*)?$/)
      expect(init?.method).toBe('DELETE')
    })
  })
})
