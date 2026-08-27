import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { LocalDbApi } from '@/shared/lib/local-db'
import type { Session, User } from '../model/types'
import { UnauthorizedError } from '@/shared/lib/data'

// Mock the typed auth API so the store is tested in isolation (no network).
vi.mock('../api/session-api', () => ({
  sessionApi: {
    getCurrentUser: vi.fn<() => Promise<User>>(),
    register: vi.fn<(email: string, password: string) => Promise<User>>(),
    login: vi.fn<(email: string, password: string) => Promise<User>>(),
    logout: vi.fn<() => Promise<void>>(),
    listSessions: vi.fn<() => Promise<Session[]>>(),
    deleteAllSessions: vi.fn<() => Promise<void>>(),
    verifyEmail: vi.fn<(code: string) => Promise<void>>(),
    resendVerification: vi.fn<() => Promise<void>>(),
    requestPasswordReset: vi.fn<(email: string) => Promise<void>>(),
    confirmPasswordReset: vi.fn<(token: string, newPassword: string) => Promise<void>>(),
  },
}))

// Mock the worker RPC surface: the store only touches `meta` (ownership gate).
const metaMock = {
  getOwnerUserId: vi.fn<() => Promise<string | null>>(),
  setOwnerUserId: vi.fn<(userId: string) => Promise<void>>(),
  wipeLocalData: vi.fn<() => Promise<void>>(),
}
const localDbApi = { meta: metaMock } as unknown as LocalDbApi

vi.mock('@/shared/lib/local-db', () => ({
  getLocalDbApi: () => Promise.resolve(localDbApi),
}))

const invalidateQueries = vi.fn<() => Promise<void>>()
vi.mock('@pinia/colada', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@pinia/colada')>()),
  useQueryCache: () => ({ invalidateQueries }),
}))

// Import after the mocks are registered.
const { sessionApi } = await import('../api/session-api')
const { useAuthStore } = await import('./use-auth-store')

const user: User = {
  id: 'u1',
  email: 'user@example.com',
  emailVerified: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const otherUser: User = { ...user, id: 'u2', email: 'other@example.com' }

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(sessionApi.getCurrentUser).mockReset()
    vi.mocked(sessionApi.register).mockReset()
    vi.mocked(sessionApi.login).mockReset()
    vi.mocked(sessionApi.logout).mockReset().mockResolvedValue(undefined)
    metaMock.getOwnerUserId.mockReset()
    metaMock.setOwnerUserId.mockReset().mockResolvedValue(undefined)
    metaMock.wipeLocalData.mockReset().mockResolvedValue(undefined)
    invalidateQueries.mockReset().mockResolvedValue(undefined)
  })

  describe('ensureRestored (session restore)', () => {
    it('binds an unowned database and authenticates', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockResolvedValue(user)
      metaMock.getOwnerUserId.mockResolvedValue(null)

      const auth = useAuthStore()
      await auth.ensureRestored()

      expect(auth.status).toBe('authenticated')
      expect(auth.user).toEqual(user)
      expect(auth.isAuthenticated).toBe(true)
      expect(metaMock.setOwnerUserId).toHaveBeenCalledWith(user.id)
    })

    it('authenticates a restored session for the same owner without rebinding', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockResolvedValue(user)
      metaMock.getOwnerUserId.mockResolvedValue(user.id)

      const auth = useAuthStore()
      await auth.ensureRestored()

      expect(auth.status).toBe('authenticated')
      expect(metaMock.setOwnerUserId).not.toHaveBeenCalled()
    })

    it('lands in anonymous mode on 401 (not signed in)', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockRejectedValue(
        new UnauthorizedError('missing session cookie'),
      )
      const auth = useAuthStore()
      await auth.ensureRestored()
      expect(auth.status).toBe('anonymous')
      expect(auth.user).toBeNull()
    })

    it('lands in anonymous mode when the backend is unreachable', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockRejectedValue(new TypeError('network down'))

      const auth = useAuthStore()
      await auth.ensureRestored()

      // Offline-first: no error screen, the anonymous shell on local data.
      expect(auth.status).toBe('anonymous')
    })

    it('runs the ownership gate for a restored different owner', async () => {
      vi.mocked(sessionApi.getCurrentUser).mockResolvedValue(otherUser)
      metaMock.getOwnerUserId.mockResolvedValue(user.id)

      const auth = useAuthStore()
      const restored = auth.ensureRestored()
      // The gate parks the decision: restore cannot finish until it resolves.
      await vi.waitFor(() => expect(auth.pendingGate?.user.id).toBe(otherUser.id))
      expect(auth.isAuthenticated).toBe(false)

      auth.cancelOwnershipGate()
      await expect(restored).resolves.toBeUndefined()
    })
  })

  describe('ownership gate', () => {
    it('unowned data: login binds the owner and authenticates', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(user)
      metaMock.getOwnerUserId.mockResolvedValue(null)

      const auth = useAuthStore()
      const result = await auth.login('user@example.com', 'password')

      expect(result).toEqual({ ok: true })
      expect(auth.status).toBe('authenticated')
      expect(metaMock.setOwnerUserId).toHaveBeenCalledWith(user.id)
    })

    it('same owner: login authenticates without touching the binding', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(user)
      metaMock.getOwnerUserId.mockResolvedValue(user.id)

      const auth = useAuthStore()
      await auth.login('user@example.com', 'password')

      expect(auth.status).toBe('authenticated')
      expect(metaMock.setOwnerUserId).not.toHaveBeenCalled()
    })

    it('different owner: delete wipes local data, rebinds and authenticates', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(otherUser)
      metaMock.getOwnerUserId.mockResolvedValue(user.id)

      const auth = useAuthStore()
      const pending = auth.login('other@example.com', 'password')
      await vi.waitFor(() => expect(auth.pendingGate).not.toBeNull())

      await auth.confirmOwnershipGateDelete()
      await expect(pending).resolves.toEqual({ ok: true })

      expect(metaMock.wipeLocalData).toHaveBeenCalledTimes(1)
      expect(metaMock.setOwnerUserId).toHaveBeenCalledWith(otherUser.id)
      expect(invalidateQueries).toHaveBeenCalledTimes(1)
      expect(auth.status).toBe('authenticated')
      expect(auth.user).toEqual(otherUser)
      expect(auth.pendingGate).toBeNull()
    })

    it('different owner: cancel signs the session back out and stays anonymous', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(otherUser)
      vi.mocked(sessionApi.logout).mockResolvedValue(undefined)
      metaMock.getOwnerUserId.mockResolvedValue(user.id)

      const auth = useAuthStore()
      const pending = auth.login('other@example.com', 'password')
      await vi.waitFor(() => expect(auth.pendingGate).not.toBeNull())

      auth.cancelOwnershipGate()
      await expect(pending).resolves.toEqual({ ok: false, blockedByOwner: true })

      expect(sessionApi.logout).toHaveBeenCalledTimes(1)
      expect(metaMock.wipeLocalData).not.toHaveBeenCalled()
      expect(invalidateQueries).not.toHaveBeenCalled()
      expect(auth.status).toBe('anonymous')
      expect(auth.pendingGate).toBeNull()
    })
  })

  describe('logout', () => {
    it('keeps local data and returns to anonymous mode', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(user)
      vi.mocked(sessionApi.logout).mockResolvedValue(undefined)
      metaMock.getOwnerUserId.mockResolvedValue(null)

      const auth = useAuthStore()
      await auth.login('user@example.com', 'password')
      expect(auth.isAuthenticated).toBe(true)

      await auth.logout()

      expect(auth.status).toBe('anonymous')
      expect(auth.user).toBeNull()
      // Nothing was wiped: the owner binding and local data survive logout.
      expect(metaMock.wipeLocalData).not.toHaveBeenCalled()
    })
  })

  describe('clearSession', () => {
    it('drops local auth state without a network call', async () => {
      vi.mocked(sessionApi.login).mockResolvedValue(user)
      metaMock.getOwnerUserId.mockResolvedValue(null)

      const auth = useAuthStore()
      await auth.login('user@example.com', 'password')
      auth.clearSession()

      expect(auth.user).toBeNull()
      expect(auth.status).toBe('anonymous')
      expect(sessionApi.logout).not.toHaveBeenCalled()
    })
  })
})
