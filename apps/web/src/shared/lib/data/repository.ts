type RepositoryErrorCode =
  | 'not-found'
  | 'has-references'
  | 'invalid-payload'
  | 'unknown-references'

class RepositoryError extends Error {
  constructor(
    message: string,
    readonly code: RepositoryErrorCode,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class NotFoundError extends RepositoryError {
  constructor(message: string) {
    super(message, 'not-found')
    this.name = 'NotFoundError'
  }
}

export class ReferentialIntegrityError extends RepositoryError {
  constructor(message: string) {
    super(message, 'has-references')
    this.name = 'ReferentialIntegrityError'
  }
}

export class InvalidPayloadError extends RepositoryError {
  constructor(message: string) {
    super(message, 'invalid-payload')
    this.name = 'InvalidPayloadError'
  }
}

export class UnknownReferencesError extends RepositoryError {
  constructor(message: string) {
    super(message, 'unknown-references')
    this.name = 'UnknownReferencesError'
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
    }
  }
  return messages.generic
}
