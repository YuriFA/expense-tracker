import { createApiClient } from '@expense-tracker/api'

// Resolve a base URL the generated client can build absolute Request URLs from.
//
// Default (no env): same-origin via the Vite dev/preview proxy - `/api/*` is
// forwarded to the backend (see vite.config.ts), which keeps the session cookie
// same-origin (no SameSite/Secure friction) and sidesteps CORS preflight so
// PATCH / custom headers (Idempotency-Key) work without extra backend CORS.
//
// Set `VITE_API_BASE_URL` to point the client directly at the backend
// (cross-origin) when not proxying.
function resolveBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL
  if (env) return env
  return typeof window !== 'undefined' && window.location ? window.location.origin : ''
}

// The shared `createApiClient` factory (framework-agnostic) attaches the error
// middleware that throws a typed RepositoryError on every non-2xx response.
export const apiClient = createApiClient({ baseUrl: resolveBaseUrl() })
