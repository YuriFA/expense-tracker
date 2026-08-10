// Domain error model used by repositories. The coarse `code` drives i18n messages;
// the optional `apiCode` preserves the backend's exact machine code (e.g.
// `ACCOUNT_IN_USE`) so callers can switch on it instead of guessing from HTTP
// status.

export type RepositoryErrorCode =
  | 'not-found'
  | 'has-references'
  | 'invalid-payload'
  | 'unknown-references'
  | 'version-conflict'
  | 'already-exists'
  | 'unauthorized'
  | 'rate-limited'
  | 'conflict'
  | 'unknown'

export interface RepositoryErrorOptions {
  /** Raw backend `ErrorResponse.code`, e.g. `ACCOUNT_IN_USE`. */
  apiCode?: string
  /** Seconds until the throttled action can be retried (from `Retry-After`). */
  retryAfter?: number
}

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode
  readonly apiCode?: string
  readonly retryAfter?: number

  constructor(
    message: string,
    code: RepositoryErrorCode,
    options: RepositoryErrorOptions = {},
  ) {
    super(message)
    this.name = 'RepositoryError'
    this.code = code
    this.apiCode = options.apiCode
    this.retryAfter = options.retryAfter
  }
}

export class NotFoundError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'not-found', options)
    this.name = 'NotFoundError'
  }
}

export class ReferentialIntegrityError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'has-references', options)
    this.name = 'ReferentialIntegrityError'
  }
}

export class InvalidPayloadError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'invalid-payload', options)
    this.name = 'InvalidPayloadError'
  }
}

export class UnknownReferencesError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'unknown-references', options)
    this.name = 'UnknownReferencesError'
  }
}

/** Optimistic-concurrency conflict (`409 TRANSACTION_VERSION_CONFLICT`). */
export class VersionConflictError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'version-conflict', options)
    this.name = 'VersionConflictError'
  }
}

/** Resource already exists (`409 CATEGORY_ALREADY_EXISTS` / `USER_ALREADY_EXISTS`). */
export class AlreadyExistsError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'already-exists', options)
    this.name = 'AlreadyExistsError'
  }
}

/** No valid session (`401`). */
export class UnauthorizedError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'unauthorized', options)
    this.name = 'UnauthorizedError'
  }
}

/** Throttled (`429`); carries `retryAfter`. */
export class RateLimitedError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'rate-limited', options)
    this.name = 'RateLimitedError'
  }
}

/** Other `409` conflicts not covered above (e.g. idempotency-key mismatch). */
export class ConflictError extends RepositoryError {
  constructor(message: string, options?: RepositoryErrorOptions) {
    super(message, 'conflict', options)
    this.name = 'ConflictError'
  }
}

export interface Repository<T, CreatePayload, UpdatePayload> {
  getAll(): Promise<T[]>
  getById(id: string): Promise<T | null>
  create(payload: CreatePayload): Promise<T>
  update(id: string, payload: UpdatePayload): Promise<T>
  remove(id: string): Promise<void>
}

export interface RepositoryErrorMessages {
  notFound: string
  hasReferences: string
  invalidPayload: string
  unknownReferences: string
  versionConflict: string
  alreadyExists: string
  unauthorized: string
  rateLimited: string
  conflict: string
  generic: string
}

export function getRepositoryErrorMessage(
  error: unknown,
  messages: RepositoryErrorMessages,
): string {
  if (error instanceof RepositoryError) {
    switch (error.code) {
      case 'not-found':
        return messages.notFound
      case 'has-references':
        return messages.hasReferences
      case 'invalid-payload':
        return messages.invalidPayload
      case 'unknown-references':
        return messages.unknownReferences
      case 'version-conflict':
        return messages.versionConflict
      case 'already-exists':
        return messages.alreadyExists
      case 'unauthorized':
        return messages.unauthorized
      case 'rate-limited':
        return messages.rateLimited
      case 'conflict':
        return messages.conflict
      case 'unknown':
        return messages.generic
    }
  }
  return messages.generic
}
