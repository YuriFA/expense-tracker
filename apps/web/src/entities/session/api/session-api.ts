import { apiClient } from '@/shared/api'
import type { components } from '@/shared/api'
import type { Session, User } from '../model/types'

type ApiUser = components['schemas']['User']
type ApiSession = components['schemas']['SessionResponse']

function toUser(value: ApiUser): User {
  return {
    id: value.id,
    email: value.email,
    emailVerified: value.emailVerified,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function toSession(value: ApiSession): Session {
  return {
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    expiresAt: value.expiresAt,
    isCurrent: value.isCurrent,
  }
}

// The error middleware throws on every non-2xx response, so a resolved call
// always carries a body. This asserts that invariant for the type system.
function requireData<T>(data: T | undefined): T {
  if (data === undefined) {
    throw new Error('Expected a response body but received none')
  }
  return data
}

/**
 * Typed wrappers over the generated client for the auth/session surface. The
 * session is an HttpOnly cookie set by the backend; these calls rely on
 * `credentials: 'include'` (configured on the client) to send/refresh it.
 */
export const sessionApi = {
  async register(email: string, password: string): Promise<User> {
    const { data } = await apiClient.POST('/api/auth/register', { body: { email, password } })
    return toUser(requireData(data))
  },
  async login(email: string, password: string): Promise<User> {
    const { data } = await apiClient.POST('/api/auth/login', { body: { email, password } })
    return toUser(requireData(data))
  },
  async logout(): Promise<void> {
    await apiClient.POST('/api/auth/logout')
  },
  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.GET('/api/auth/me')
    return toUser(requireData(data))
  },
  async listSessions(): Promise<Session[]> {
    const { data } = await apiClient.GET('/api/auth/sessions')
    return requireData(data).map(toSession)
  },
  async deleteAllSessions(): Promise<void> {
    await apiClient.DELETE('/api/auth/sessions')
  },
  async verifyEmail(code: string): Promise<void> {
    await apiClient.POST('/api/auth/verify-email', { body: { code } })
  },
  async resendVerification(): Promise<void> {
    await apiClient.POST('/api/auth/verify-email/resend')
  },
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.POST('/api/auth/password-reset/request', { body: { email } })
  },
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await apiClient.POST('/api/auth/password-reset/confirm', {
      body: { token, newPassword },
    })
  },
}
