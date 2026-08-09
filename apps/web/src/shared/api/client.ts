import createClient from 'openapi-fetch'
import { errorMiddleware } from './errors'
import type { paths } from './schema'

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
  return typeof window !== 'undefined' && window.location
    ? window.location.origin
    : ''
}

export const apiClient = createClient<paths>({
  baseUrl: resolveBaseUrl(),
  credentials: 'include',
  // Resolve `fetch` lazily so tests can spy on the global between requests.
  fetch: (request: Request) => globalThis.fetch(request),
})

// Every non-2xx response is mapped to a thrown RepositoryError (see errors.ts).
apiClient.use(errorMiddleware)

export type { paths } from './schema'
