import { describe, it, expect } from 'vitest'
import { mapApiError } from './errors'
import {
  AlreadyExistsError,
  InvalidPayloadError,
  NotFoundError,
  RateLimitedError,
  ReferentialIntegrityError,
  UnauthorizedError,
  UnknownReferencesError,
  VersionConflictError,
  ConflictError,
  RepositoryError,
} from '@/shared/lib/data'

function response(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers })
}

describe('mapApiError', () => {
  it('maps 401 to UnauthorizedError', () => {
    const error = mapApiError(401, { code: 'UNAUTHORIZED', message: 'no session' }, response(401))
    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error.code).toBe('unauthorized')
  })

  it('maps 404 to NotFoundError', () => {
    const error = mapApiError(
      404,
      { code: 'ACCOUNT_NOT_FOUND', message: 'not found' },
      response(404),
    )
    expect(error).toBeInstanceOf(NotFoundError)
  })

  it('maps 409 TRANSACTION_VERSION_CONFLICT to VersionConflictError', () => {
    const error = mapApiError(
      409,
      { code: 'TRANSACTION_VERSION_CONFLICT', message: 'conflict' },
      response(409),
    )
    expect(error).toBeInstanceOf(VersionConflictError)
  })

  it('maps 409 ACCOUNT_IN_USE / CATEGORY_IN_USE to ReferentialIntegrityError', () => {
    for (const code of ['ACCOUNT_IN_USE', 'CATEGORY_IN_USE']) {
      expect(
        mapApiError(409, { code, message: 'in use' }, response(409)),
      ).toBeInstanceOf(ReferentialIntegrityError)
    }
  })

  it('maps 409 CATEGORY_ALREADY_EXISTS / USER_ALREADY_EXISTS to AlreadyExistsError', () => {
    for (const code of ['CATEGORY_ALREADY_EXISTS', 'USER_ALREADY_EXISTS']) {
      expect(
        mapApiError(409, { code, message: 'exists' }, response(409)),
      ).toBeInstanceOf(AlreadyExistsError)
    }
  })

  it('maps other 409 (idempotency) to ConflictError', () => {
    const error = mapApiError(
      409,
      { code: 'IDEMPOTENCY_KEY_MISMATCH', message: 'mismatch' },
      response(409),
    )
    expect(error).toBeInstanceOf(ConflictError)
  })

  it('maps 422 INVALID_REFS to UnknownReferencesError', () => {
    const error = mapApiError(
      422,
      { code: 'INVALID_REFS', message: 'invalid refs' },
      response(422),
    )
    expect(error).toBeInstanceOf(UnknownReferencesError)
  })

  it('maps 422 ACCOUNT_NOT_FOUND (FK context) to UnknownReferencesError', () => {
    const error = mapApiError(
      422,
      { code: 'ACCOUNT_NOT_FOUND', message: 'referenced account missing' },
      response(422),
    )
    expect(error).toBeInstanceOf(UnknownReferencesError)
  })

  it('maps 422 SAME_ACCOUNT_TRANSFER to InvalidPayloadError', () => {
    const error = mapApiError(
      422,
      { code: 'SAME_ACCOUNT_TRANSFER', message: 'same account' },
      response(422),
    )
    expect(error).toBeInstanceOf(InvalidPayloadError)
  })

  it('maps 422 CATEGORY_TYPE_MISMATCH to InvalidPayloadError', () => {
    const error = mapApiError(
      422,
      { code: 'CATEGORY_TYPE_MISMATCH', message: 'mismatch' },
      response(422),
    )
    expect(error).toBeInstanceOf(InvalidPayloadError)
  })

  it('maps 400 VALIDATION_FAILED to InvalidPayloadError', () => {
    const error = mapApiError(
      400,
      { code: 'VALIDATION_FAILED', message: 'validation' },
      response(400),
    )
    expect(error).toBeInstanceOf(InvalidPayloadError)
  })

  it('maps 429 with Retry-After to RateLimitedError carrying retryAfter', () => {
    const error = mapApiError(
      429,
      { code: 'TOO_MANY_REQUESTS', message: 'slow down' },
      response(429, { 'Retry-After': '42' }),
    )
    expect(error).toBeInstanceOf(RateLimitedError)
    expect(error.retryAfter).toBe(42)
  })

  it('maps unmapped statuses to a generic RepositoryError', () => {
    const error = mapApiError(500, { code: 'INTERNAL_ERROR', message: 'boom' }, response(500))
    expect(error).toBeInstanceOf(RepositoryError)
    expect(error.code).toBe('unknown')
  })

  it('preserves the backend code on every mapped error', () => {
    const error = mapApiError(409, { code: 'ACCOUNT_IN_USE', message: 'x' }, response(409))
    expect(error.apiCode).toBe('ACCOUNT_IN_USE')
  })
})
