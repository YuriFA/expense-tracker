import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { notification } from './notification'
import {
  NotFoundError,
  ReferentialIntegrityError,
  InvalidPayloadError,
  UnknownReferencesError,
} from '@/shared/lib/data'

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn<(...args: unknown[]) => void>(),
    error: vi.fn<(...args: unknown[]) => void>(),
    warning: vi.fn<(...args: unknown[]) => void>(),
    info: vi.fn<(...args: unknown[]) => void>(),
  },
}))

vi.mock('@/shared/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/data')>('@/shared/lib/data')
  return {
    ...actual,
    getRepositoryErrorMessages: vi.fn<() => Record<string, string>>(() => ({
      notFound: 'NOT_FOUND_MSG',
      hasReferences: 'HAS_REFS_MSG',
      invalidPayload: 'INVALID_PAYLOAD_MSG',
      unknownReferences: 'UNKNOWN_REFS_MSG',
      generic: 'GENERIC_MSG',
    })),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mutationError', () => {
  it('shows title with description', () => {
    notification.mutationError(new NotFoundError('x'), {
      title: 'Error adding account',
      action: 'create',
    })
    expect(toast.error).toHaveBeenCalledWith('Error adding account', {
      description: 'NOT_FOUND_MSG',
    })
  })

  it.each([
    [new NotFoundError('x'), 'NOT_FOUND_MSG'],
    [new ReferentialIntegrityError('x'), 'HAS_REFS_MSG'],
    [new InvalidPayloadError('x'), 'INVALID_PAYLOAD_MSG'],
    [new UnknownReferencesError('x'), 'UNKNOWN_REFS_MSG'],
  ])('maps %s to the description', (error, expected) => {
    notification.mutationError(error, { title: 'T', action: 'delete' })
    expect(toast.error).toHaveBeenCalledWith('T', { description: expected })
  })

  it('falls back to generic for non-repository errors', () => {
    notification.mutationError(new Error('whatever'), { title: 'T' })
    expect(toast.error).toHaveBeenCalledWith('T', { description: 'GENERIC_MSG' })
  })

  it('logs to console with action tag', () => {
    notification.mutationError(new Error('x'), { title: 'T', action: 'delete' })
    expect(console.error).toHaveBeenCalledWith('[delete]', expect.any(Error))
  })
})
