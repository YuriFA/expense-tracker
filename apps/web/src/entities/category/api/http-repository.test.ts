import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { components } from '@/shared/api'
import { ReferentialIntegrityError } from '@/shared/lib/data'
import { createHTTPCategoryRepository } from './http-repository'

type ApiCategory = components['schemas']['Category']

const apiCategory: ApiCategory = {
  id: 'c1',
  userId: 'u1',
  name: 'Food',
  type: 'expense',
  icon: 'utensils',
  color: '#FF0000',
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

describe('category HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('calls GET /categories and returns parsed array (no slug from backend)', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, [apiCategory]))
      const repo = createHTTPCategoryRepository()
      const result = await repo.getAll()
      expect(result).toEqual([
        { id: 'c1', name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000' },
      ])
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/categories')
      expect(call.method).toBe('GET')
    })
  })

  describe('getById', () => {
    it('calls GET /categories/{id} and returns category', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, apiCategory))
      const repo = createHTTPCategoryRepository()
      const result = await repo.getById('c1')
      expect(result?.id).toBe('c1')
      expect(inspect(fetchSpy.mock.calls[0]).url.pathname).toBe('/api/categories/c1')
    })

    it('returns null on 404', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(404, { code: 'CATEGORY_NOT_FOUND', message: 'not found' }),
      )
      const repo = createHTTPCategoryRepository()
      expect(await repo.getById('missing')).toBeNull()
    })
  })

  describe('create', () => {
    it('calls POST /categories with JSON body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(201, apiCategory))
      const repo = createHTTPCategoryRepository()
      const result = await repo.create({
        name: 'Food',
        type: 'expense',
        icon: 'utensils',
        color: '#FF0000',
      })
      expect(result.id).toBe('c1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/categories')
      expect(call.method).toBe('POST')
      const body = await (fetchSpy.mock.calls[0]![0] as Request).clone().json()
      expect(body).toEqual({ name: 'Food', type: 'expense', icon: 'utensils', color: '#FF0000' })
    })
  })

  describe('update', () => {
    it('calls PATCH (not PUT) /categories/{id} with JSON body', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, { ...apiCategory, name: 'Groceries' }))
      const repo = createHTTPCategoryRepository()
      const result = await repo.update('c1', { name: 'Groceries' })
      expect(result.name).toBe('Groceries')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/categories/c1')
      expect(call.method).toBe('PATCH')
      const body = await (fetchSpy.mock.calls[0]![0] as Request).clone().json()
      expect(body).toEqual({ name: 'Groceries' })
    })
  })

  describe('remove', () => {
    it('calls DELETE /categories/{id}', async () => {
      fetchSpy.mockResolvedValueOnce(jsonResponse(204, null))
      const repo = createHTTPCategoryRepository()
      await repo.remove('c1')
      const call = inspect(fetchSpy.mock.calls[0])
      expect(call.url.pathname).toBe('/api/categories/c1')
      expect(call.method).toBe('DELETE')
    })

    it('maps a 409 CATEGORY_IN_USE to ReferentialIntegrityError', async () => {
      fetchSpy.mockResolvedValueOnce(
        jsonResponse(409, { code: 'CATEGORY_IN_USE', message: 'in use' }),
      )
      const repo = createHTTPCategoryRepository()
      await expect(repo.remove('c1')).rejects.toBeInstanceOf(ReferentialIntegrityError)
    })
  })
})
