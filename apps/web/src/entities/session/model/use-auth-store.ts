import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { sessionApi } from '../api/session-api'
import type { User } from '../model/types'
import { UnauthorizedError } from '@/shared/lib/data'

/**
 * Holds the current user/session. The session itself lives in an HttpOnly
 * cookie managed by the backend; this store only tracks the resolved user and
 * whether we have attempted to restore the session on startup.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  // Whether we have attempted to load the session this app run, so the router
  // guard only bootstraps once.
  const isReady = ref(false)
  const isLoading = ref(false)

  const isAuthenticated = computed(() => user.value !== null)

  /** Restore the current user from the session cookie. A 401 means "not signed
   * in" and is swallowed (the router guard then redirects to login). */
  async function fetchMe(): Promise<void> {
    isLoading.value = true
    try {
      user.value = await sessionApi.getCurrentUser()
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        user.value = null
        return
      }
      throw error
    } finally {
      isLoading.value = false
      isReady.value = true
    }
  }

  async function register(email: string, password: string): Promise<void> {
    user.value = await sessionApi.register(email, password)
    isReady.value = true
  }

  async function login(email: string, password: string): Promise<void> {
    user.value = await sessionApi.login(email, password)
    isReady.value = true
  }

  async function logout(): Promise<void> {
    await sessionApi.logout()
    user.value = null
  }

  /** Drop local auth state without calling the backend (used by the 401 hook). */
  function clearSession(): void {
    user.value = null
  }

  return {
    user,
    isReady,
    isLoading,
    isAuthenticated,
    fetchMe,
    register,
    login,
    logout,
    clearSession,
  }
})
