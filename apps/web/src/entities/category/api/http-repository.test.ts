import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Category } from '../model/types'
import { createHTTPCategoryRepository } from './http-repository'

const categoryFixture: Category = {
  id: 'c1',
  name: 'Food',
  type: 'expense',
  icon: '🍔',
  color: '#FF0000',
  slug: 'food',
}

function mockJsonResponse(status: number, body: unknown) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

describe('category HTTP repository', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  describe('getAll', () => {
    it('calls GET /categories and returns parsed array', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, [categoryFixture]))
      const repo = createHTTPCategoryRepository()
      const result = await repo.getAll()
      expect(result).toEqual([categoryFixture])
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('getById', () => {
    it('calls GET /categories/:id and returns category', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, categoryFixture))
      const repo = createHTTPCategoryRepository()
      const result = await repo.getById('c1')
      expect(result).toEqual(categoryFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories\/c1(\?.*)?$/)
      expect(init?.method ?? 'GET').toBe('GET')
    })
  })

  describe('create', () => {
    it('calls POST /categories with JSON body and returns created category', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(201, categoryFixture))
      const repo = createHTTPCategoryRepository()
      const payload = {
        name: 'Food',
        type: 'expense' as const,
        icon: '🍔',
        color: '#FF0000',
        slug: 'food',
      }
      const result = await repo.create(payload)
      expect(result).toEqual(categoryFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories(\?.*)?$/)
      expect(init?.method).toBe('POST')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('update', () => {
    it('calls PUT /categories/:id with JSON body and returns updated category', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, categoryFixture))
      const repo = createHTTPCategoryRepository()
      const payload = { name: 'Updated', icon: '🍽️' }
      const result = await repo.update('c1', payload)
      expect(result).toEqual(categoryFixture)
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories\/c1(\?.*)?$/)
      expect(init?.method).toBe('PUT')
      expect(JSON.parse(String(init?.body))).toEqual(payload)
    })
  })

  describe('remove', () => {
    it('calls DELETE /categories/:id', async () => {
      fetchSpy.mockImplementation(mockJsonResponse(200, null))
      const repo = createHTTPCategoryRepository()
      await repo.remove('c1')
      const [url, init] = fetchSpy.mock.calls[0]!
      expect(String(url)).toMatch(/\/categories\/c1(\?.*)?$/)
      expect(init?.method).toBe('DELETE')
    })
  })
})
