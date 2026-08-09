// Mirrors the backend `User` and `SessionResponse` schemas (see schema.ts).
// Auth is session-based (cookie); the client never holds a token.

export interface User {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Session {
  createdAt: string
  updatedAt: string
  expiresAt: string
  isCurrent: boolean
}
