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

describe('success', () => {
  it('calls toast.success', () => {
    notification.success('done')
    expect(toast.success).toHaveBeenCalledWith('done')
    expect(toast.success).toHaveBeenCalledTimes(1)
  })
})

describe('info', () => {
  it('calls toast.info', () => {
    notification.info('done')
    expect(toast.info).toHaveBeenCalledWith('done')
    expect(toast.info).toHaveBeenCalledTimes(1)
  })
})

describe('warning', () => {
  it('calls toast.warning', () => {
    notification.warning('done')
    expect(toast.warning).toHaveBeenCalledWith('done')
    expect(toast.warning).toHaveBeenCalledTimes(1)
  })
})

describe('error', () => {
  it('calls toast.error', () => {
    notification.error('done')
    expect(toast.error).toHaveBeenCalledWith('done')
    expect(toast.error).toHaveBeenCalledTimes(1)
  })
})

describe('repositoryError', () => {
  it.each([
    [new NotFoundError('x'), 'NOT_FOUND_MSG'],
    [new ReferentialIntegrityError('x'), 'HAS_REFS_MSG'],
    [new InvalidPayloadError('x'), 'INVALID_PAYLOAD_MSG'],
    [new UnknownReferencesError('x'), 'UNKNOWN_REFS_MSG'],
  ])('maps %s to message', (error, expected) => {
    notification.repositoryError(error)
    expect(toast.error).toHaveBeenCalledWith(expected)
  })

  it('falls back to generic for non-repository errors', () => {
    notification.repositoryError(new Error('whatever'))
    expect(toast.error).toHaveBeenCalledWith('GENERIC_MSG')
  })

  it('logs to console with action tag', () => {
    notification.repositoryError(new Error('x'), { action: 'delete' })
    expect(console.error).toHaveBeenCalledWith('[delete]', expect.any(Error))
  })
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
})
