import createClient from 'openapi-fetch'
import { errorMiddleware } from './api-errors'
import type { paths } from './schema'

export interface CreateApiClientOptions {
  /**
   * Base URL the generated client builds absolute Request URLs from. Omit (or
   * pass `''`) for same-origin relative requests, which is the default in the
   * web app via its dev/preview proxy. Each app resolves its own base URL from
   * its environment - the factory itself never touches `window`.
   */
  baseUrl?: string
  /** Cookie/credential mode for outgoing requests (default `'include'`). */
  credentials?: RequestCredentials
  /**
   * Custom fetch used for requests. Defaults to the global `fetch` (resolved
   * lazily per request so tests can spy on it between calls).
   */
  fetch?: (request: Request) => Promise<Response>
}

/**
 * Creates an `openapi-fetch` client typed against the generated OpenAPI
 * contract, with the error middleware attached so every non-2xx response is
 * thrown as a typed {@link RepositoryError}. Works in any environment that
 * provides the fetch-family globals (browser, Node, React Native).
 */
export function createApiClient(options: CreateApiClientOptions = {}) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    credentials: options.credentials ?? 'include',
    // Resolve `fetch` lazily so tests can spy on the global between requests.
    fetch: options.fetch ?? ((request: Request) => globalThis.fetch(request)),
  })

  // Every non-2xx response is mapped to a thrown RepositoryError (api-errors.ts).
  client.use(errorMiddleware)
  return client
}

export type ApiClient = ReturnType<typeof createApiClient>
