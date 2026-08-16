// Session/user model (the mobile twin of apps/web's entities/session types).
// The session itself is the backend's HttpOnly cookie; only the resolved user
// lives in app state.

export interface User {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export type AuthStatus = 'restoring' | 'anonymous' | 'authenticated'

/** Outcome of a login/register attempt after the ownership gate ran. */
export interface AuthResult {
  ok: boolean
  /** Present when a different user's data blocks the login (user cancelled). */
  blockedByOwner?: boolean
}
