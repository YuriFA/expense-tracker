import type { Middleware } from 'openapi-fetch'
import type { components } from './schema'

type ErrorResponse = components['schemas']['ErrorResponse']

import {
  AlreadyExistsError,
  ConflictError,
  InvalidPayloadError,
  NotFoundError,
  RateLimitedError,
  ReferentialIntegrityError,
  RepositoryError,
  UnauthorizedError,
  UnknownReferencesError,
  VersionConflictError,
} from '@/shared/lib/data'

// Backend codes that mean "used by other rows, cannot delete".
const IN_USE_CODES = new Set(['ACCOUNT_IN_USE', 'CATEGORY_IN_USE'])

// Backend codes that mean "the row does not exist" (returned at 404).
const NOT_FOUND_BY_ID_CODES = new Set([
  'ACCOUNT_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
  'TRANSACTION_NOT_FOUND',
])

// Backend codes returned at 422 that mean "referenced account/category is
// invalid or missing" (FK-validation context inside a transaction).
const UNKNOWN_REF_CODES = new Set(['INVALID_REFS'])

// 422 codes that are business-rule violations but NOT missing references.
const BUSINESS_RULE_CODES = new Set(['SAME_ACCOUNT_TRANSFER', 'CATEGORY_TYPE_MISMATCH'])

const ALREADY_EXISTS_CODES = new Set([
  'CATEGORY_ALREADY_EXISTS',
  'USER_ALREADY_EXISTS',
  'EMAIL_ALREADY_VERIFIED',
])

// Decode the backend's `Retry-After` header (seconds) for throttled responses.
function readRetryAfter(response: Response): number | undefined {
  const raw = response.headers.get('Retry-After')
  if (!raw) return undefined
  const seconds = Number.parseInt(raw, 10)
  return Number.isFinite(seconds) ? seconds : undefined
}

/**
 * Maps a non-2xx API response to a typed {@link RepositoryError}, switching on
 * the backend's `ErrorResponse.code` rather than guessing from HTTP status
 * alone. This keeps the 1:1 mapping with the spec (e.g. `ACCOUNT_IN_USE` vs
 * `TRANSACTION_VERSION_CONFLICT` vs `USER_ALREADY_EXISTS`, all 409).
 */
export function mapApiError(
  status: number,
  body: Partial<ErrorResponse> | undefined,
  response: Response,
) {
  const code = body?.code
  const message = body?.message ?? `HTTP ${status}`
  const retryAfter = readRetryAfter(response)

  if (status === 401) {
    triggerUnauthorized()
    return new UnauthorizedError(message, { apiCode: code })
  }

  if (status === 429 || code === 'TOO_MANY_REQUESTS') {
    return new RateLimitedError(message, { apiCode: code, retryAfter })
  }

  if (code === 'TRANSACTION_VERSION_CONFLICT') {
    return new VersionConflictError(message, { apiCode: code })
  }

  if (code && IN_USE_CODES.has(code)) {
    return new ReferentialIntegrityError(message, { apiCode: code })
  }

  if (code && ALREADY_EXISTS_CODES.has(code)) {
    return new AlreadyExistsError(message, { apiCode: code })
  }

  // 404 by id (cross-user access also returns 404 to stay IDOR-safe).
  if (status === 404) {
    return new NotFoundError(message, { apiCode: code })
  }

  // 422 foreign-key validation inside a transaction -> unknown references.
  if (status === 422 && (UNKNOWN_REF_CODES.has(code ?? '') || NOT_FOUND_BY_ID_CODES.has(code ?? ''))) {
    return new UnknownReferencesError(message, { apiCode: code })
  }

  // Other 422 business rules (same-account transfer, type mismatch) -> invalid.
  if (status === 422) {
    return new InvalidPayloadError(message, { apiCode: code })
  }

  if (status === 400) {
    return new InvalidPayloadError(message, { apiCode: code })
  }

  // Other 409 conflicts (e.g. idempotency-key mismatch / in-use).
  if (status === 409) {
    return new ConflictError(message, { apiCode: code })
  }

  // Business-rule violations surfacing on PATCH (e.g. empty body, type change).
  if (code && BUSINESS_RULE_CODES.has(code)) {
    return new InvalidPayloadError(message, { apiCode: code })
  }

  return new RepositoryError(message, 'unknown', { apiCode: code })
}

// --- 401 interceptor -------------------------------------------------------
//
// The data layer must not import router/entities (FSD layer direction), so the
// app layer (main.ts) registers a single unauthorized handler. It only fires
// for authenticated requests that lost their session; unauthenticated calls
// (login/register/me before login) handle UnauthorizedError themselves.
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function triggerUnauthorized(): void {
  unauthorizedHandler?.()
}

/**
 * openapi-fetch middleware that converts every non-2xx response into a thrown
 * {@link RepositoryError}. The body is cloned (openapi-fetch parses the
 * original later) and runs before openapi-fetch's own parsing, so callers see
 * the mapped error via the normal rejection path.
 */
export const errorMiddleware: Middleware = {
  async onResponse({ response }) {
    if (response.ok) return undefined
    const body = (await response.clone().json().catch(() => undefined)) as
      | Partial<ErrorResponse>
      | undefined
    throw mapApiError(response.status, body, response)
  },
}
