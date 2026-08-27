import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { sessionApi } from '../api/session-api'
import type {
  AuthResult,
  AuthStatus,
  PendingOwnershipGate,
  User,
} from '../model/types'
import { getLocalDbApi } from '@/shared/lib/local-db'

/**
 * Auth state with the mobile status machine (design D5):
 * `restoring` -> `anonymous` <-> `authenticated`. Offline-first means the
 * session restore is network-tolerant - a 401 (not signed in) AND a
 * network/backend failure both land in the anonymous shell, never an error
 * screen. Login/register/restored sessions all pass the ownership gate over
 * the local database's owner binding; logout keeps every byte of local data
 * (the outbox waits for the next authentication).
 */
export const useAuthStore = defineStore('auth', () => {
  const queryCache = useQueryCache()

  const user = ref<User | null>(null)
  const status = ref<AuthStatus>('restoring')
  /** Set while the ownership dialog awaits the user's choice (design D5). */
  const pendingGate = ref<PendingOwnershipGate | null>(null)

  const isAuthenticated = computed(() => status.value === 'authenticated' && user.value !== null)

  /** Binds an unowned database to its first authenticated user, then flips to `authenticated`. */
  async function completeAuthentication(authenticated: User): Promise<void> {
    const db = await getLocalDbApi()
    if (!(await db.meta.getOwnerUserId())) {
      await db.meta.setOwnerUserId(authenticated.id)
    }
    user.value = authenticated
    status.value = 'authenticated'
  }

  /**
   * The ownership gate: unowned or same-owner passes straight through; a
   * different owner parks the decision in `pendingGate` for the globally
   * mounted dialog - wipe the data (destructive) or cancel (server-side
   * logout, local data untouched).
   */
  async function passOwnershipGate(authenticated: User): Promise<AuthResult> {
    const db = await getLocalDbApi()
    const owner = await db.meta.getOwnerUserId()
    if (!owner || owner === authenticated.id) {
      await completeAuthentication(authenticated)
      return { ok: true }
    }
    return new Promise<AuthResult>((resolve) => {
      pendingGate.value = { user: authenticated, resolve }
    })
  }

  /** The dialog's destructive choice: wipe local data, rebind, authenticate. */
  async function confirmOwnershipGateDelete(): Promise<void> {
    const pending = pendingGate.value
    if (!pending) return
    pendingGate.value = null

    const db = await getLocalDbApi()
    await db.meta.wipeLocalData()
    await db.meta.setOwnerUserId(pending.user.id)
    // Everything cached belonged to the wiped dataset.
    await queryCache.invalidateQueries()
    await completeAuthentication(pending.user)
    pending.resolve({ ok: true })
  }

  /**
   * The dialog's cancel choice: sign the just-authenticated session back out
   * server-side and stay anonymous with the owner's local data intact.
   */
  function cancelOwnershipGate(): void {
    const pending = pendingGate.value
    if (!pending) return
    pendingGate.value = null
    void sessionApi.logout().catch(() => undefined)
    status.value = 'anonymous'
    pending.resolve({ ok: false, blockedByOwner: true })
  }

  let restorePromise: Promise<void> | null = null

  /**
   * Restores the session once per app run. A 401 means "not signed in"; an
   * unreachable backend means the anonymous shell - either way there is no
   * error state to show. A restored session for a different user than the
   * local owner goes through the same ownership gate as login.
   */
  function ensureRestored(): Promise<void> {
    restorePromise ??= sessionApi
      .getCurrentUser()
      .then((restored) => passOwnershipGate(restored).then(() => undefined))
      .catch(() => {
        // Not signed in (401) or the backend is unreachable: offline-first
        // means the anonymous shell, not a blocking error screen.
        status.value = 'anonymous'
      })
    return restorePromise
  }

  async function register(email: string, password: string): Promise<AuthResult> {
    const created = await sessionApi.register(email, password)
    return passOwnershipGate(created)
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    const authenticated = await sessionApi.login(email, password)
    return passOwnershipGate(authenticated)
  }

  /** Logout keeps all local data; queued sync operations wait for the next authentication. */
  async function logout(): Promise<void> {
    await sessionApi.logout().catch(() => undefined)
    user.value = null
    status.value = 'anonymous'
  }

  /** Re-reads the current user (e.g. after email verification flips emailVerified). */
  async function refreshUser(): Promise<void> {
    try {
      user.value = await sessionApi.getCurrentUser()
    } catch {
      // Keep the previous state; the 401 interceptor handles expired sessions.
    }
  }

  /** Drop local auth state without calling the backend (used by the 401 hook). */
  function clearSession(): void {
    user.value = null
    status.value = 'anonymous'
  }

  return {
    user,
    status,
    pendingGate,
    isAuthenticated,
    ensureRestored,
    register,
    login,
    logout,
    refreshUser,
    clearSession,
    confirmOwnershipGateDelete,
    cancelOwnershipGate,
  }
})
