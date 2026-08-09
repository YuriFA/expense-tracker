import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { User } from '../model/types'
import { UnauthorizedError } from '@/shared/lib/data'

// Mock the typed auth API so the store is tested in isolation (no network).
vi.mock('../api/session-api', () => ({
  sessionApi: {
    getCurrentUser: vi.fn(),
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    listSessions: vi.fn(),
    deleteAllSessions: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  },
}))

// Import after the mock is registered.
const { sessionApi } = await import('../api/session-api')
const { useAuthStore } = await import('./use-auth-store')

const user: User = {
  id: 'u1',
  email: 'user@example.com',
  emailVerified: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(sessionApi.getCurrentUser).mockReset()
    vi.mocked(sessionApi.register).mockReset()
    vi.mocked(sessionApi.login).mockReset()
    vi.mocked(sessionApi.logout).mockReset()
  })

  describe('fetchMe', () => {
    it('stores the current user on success and marks the store ready', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockResolvedValue(user)
      const auth = useAuthStore()
      await auth.fetchMe()
      expect(auth.user).toEqual(user)
      expect(auth.isAuthenticated).toBe(true)
      expect(auth.isReady).toBe(true)
    })

    it('clears the user on 401 without throwing (not signed in)', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockRejectedValue(
        new UnauthorizedError('missing session cookie'),
      )
      const auth = useAuthStore()
      await auth.fetchMe()
      expect(auth.user).toBeNull()
      expect(auth.isAuthenticated).toBe(false)
      expect(auth.isReady).toBe(true)
    })

    it('rethrows non-unauthorized errors', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockRejectedValue(new Error('network down'))
      const auth = useAuthStore()
      await expect(auth.fetchMe()).rejects.toThrow('network down')
    })
  })

  describe('login', () => {
    it('stores the user returned by the API', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(user)
      const auth = useAuthStore()
      await auth.login('user@example.com', 'password')
      expect(sessionApi.login).toHaveBeenCalledWith('user@example.com', 'password')
      expect(auth.user).toEqual(user)
      expect(auth.isReady).toBe(true)
    })
  })

  describe('register', () => {
    it('stores the user returned by the API', async () => {
      vi.mocked(sessionApi.register).mockResolvedValue(user)
      const auth = useAuthStore()
      await auth.register('user@example.com', 'password')
      expect(sessionApi.register).toHaveBeenCalledWith('user@example.com', 'password')
      expect(auth.user).toEqual(user)
    })
  })

  describe('logout', () => {
    it('calls the API and clears local state', async () => {
      vi.mocked(sessionApi.logout).mockResolvedValue(undefined)
      const auth = useAuthStore()
      auth.user = user
      await auth.logout()
      expect(sessionApi.logout).toHaveBeenCalled()
      expect(auth.user).toBeNull()
      expect(auth.isAuthenticated).toBe(false)
    })
  })

  describe('clearSession', () => {
    it('drops local auth state without a network call', () => {
      const auth = useAuthStore()
      auth.user = user
      auth.clearSession()
      expect(auth.user).toBeNull()
      expect(sessionApi.logout).not.toHaveBeenCalled()
    })
  })
})
