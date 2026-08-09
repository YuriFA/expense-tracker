import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { components } from '@/shared/api'
import { ReferentialIntegrityError } from '@/shared/lib/data'
import { createHTTPAccountRepository } from './http-repository'

type ApiAccount = components['schemas']['Account']

const apiAccount: ApiAccount = {
  id: 'a1',
  userId: 'u1',
  name: 'Main',
  currency: 'USD',
  openingBalance: 1000,
  manualAdjustment: 0,
  balance: 1000,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

function jsonResponse(status: number, body: unknown): Response {
  if (status === 204) return new Response(null, { status: 204 })
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function inspect(call: [input: RequestInfo | URL, init?: RequestInit] | undefined) {
  const [input, init] = call!
  const request =
    input instanceof Request ? input : { url: String(input), method: 'GET', headers: new Headers() }
  return {
    url: new URL(request.url),
    method: init?.method ?? request.method ?? 'GET',
  }
}

describe('account HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('calls GET /accounts and returns parsed array', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, [apiAccount]))
      const repo = createHTTPAccountRepository()
      const result = await repo.getAll()
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ id: 'a1', name: 'Main', balance: 1000 })
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/accounts')
      expect(call.method).toBe('GET')
    })
  })

  describe('getById', () => {
    it('calls GET /accounts/{id} and returns account', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, apiAccount))
      const repo = createHTTPAccountRepository()
      const result = await repo.getById('a1')
      expect(result?.id).toBe('a1')
      expect(inspect(fetchSpy.mock.calls[0]).url.pathname).toBe('/api/accounts/a1')
    })

    it('returns null on 404', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(404, { code: 'ACCOUNT_NOT_FOUND', message: 'not found' }),
      )
      const repo = createHTTPAccountRepository()
      expect(await repo.getById('missing')).toBeNull()
    })
  })

  describe('create', () => {
    it('calls POST /accounts with JSON body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(201, apiAccount))
      const repo = createHTTPAccountRepository()
      const result = await repo.create({ name: 'Main', currency: 'USD', openingBalance: 1000 })
      expect(result.id).toBe('a1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/accounts')
      expect(call.method).toBe('POST')
      const body = await (fetchSpy.mock.calls[0]![0] as Request).clone().json()
      expect(body).toEqual({ name: 'Main', currency: 'USD', openingBalance: 1000 })
    })
  })

  describe('update', () => {
    it('calls PATCH (not PUT) /accounts/{id} with JSON body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { ...apiAccount, name: 'Updated' }))
      const repo = createHTTPAccountRepository()
      const result = await repo.update('a1', { name: 'Updated', manualAdjustment: 50 })
      expect(result.name).toBe('Updated')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/accounts/a1')
      expect(call.method).toBe('PATCH')
      const body = await (fetchSpy.mock.calls[0]![0] as Request).clone().json()
      expect(body).toEqual({ name: 'Updated', manualAdjustment: 50 })
    })
  })

  describe('remove', () => {
    it('calls DELETE /accounts/{id}', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(204, null))
      const repo = createHTTPAccountRepository()
      await repo.remove('a1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/accounts/a1')
      expect(call.method).toBe('DELETE')
    })

    it('maps a 409 ACCOUNT_IN_USE to ReferentialIntegrityError', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(409, { code: 'ACCOUNT_IN_USE', message: 'in use' }),
      )
      const repo = createHTTPAccountRepository()
      await expect(repo.remove('a1')).rejects.toBeInstanceOf(ReferentialIntegrityError)
    })
  })
})
