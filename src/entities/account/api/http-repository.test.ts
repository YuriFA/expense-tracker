import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AccountWithBalance } from '../model/types'
import { createHTTPAccountRepository } from './http-repository'

const accountFixture: AccountWithBalance = {
  id: 'a1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
}

function mockJsonResponse(status: number, body: unknown) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

describe('account HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('calls GET /accounts and returns parsed array', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, [accountFixture]))
      const repo = createHTTPAccountRepository()
      const result = await repo.getAll()
      expect(result).toEqual([accountFixture])
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('getById', () => {
    it('calls GET /accounts/:id and returns account', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, accountFixture))
      const repo = createHTTPAccountRepository()
      const result = await repo.getById('a1')
      expect(result).toEqual(accountFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts\/a1(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('create', () => {
    it('calls POST /accounts with JSON body and returns created account', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(201, accountFixture))
      const repo = createHTTPAccountRepository()
      const payload = { name: 'Main', currency: 'USD' as const, openingBalance: 1000 }
      const result = await repo.create(payload)
      expect(result).toEqual(accountFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts(\?.*)?$/)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('update', () => {
    it('calls PUT /accounts/:id with JSON body and returns updated account', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, accountFixture))
      const repo = createHTTPAccountRepository()
      const payload = { name: 'Updated', manualAdjustment: 50 }
      const result = await repo.update('a1', payload)
      expect(result).toEqual(accountFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts\/a1(\?.*)?$/)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('remove', () => {
    it('calls DELETE /accounts/:id', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, null))
      const repo = createHTTPAccountRepository()
      await repo.remove('a1')
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/accounts\/a1(\?.*)?$/)
      expect(init?.method).toBe('DELETE')
    })
  })
})
