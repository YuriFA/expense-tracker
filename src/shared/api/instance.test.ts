import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FetchError } from 'ofetch'
import {
  InvalidPayloadError,
  NotFoundError,
  ReferentialIntegrityError,
  UnknownReferencesError,
} from '@/shared/lib/data'
import { api } from './instance'

function mockJsonResponse(status: number, body: unknown) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

describe('api client error mapping', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('maps 400 with VALIDATION_FAILED to InvalidPayloadError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(400, {
        code: 'VALIDATION_FAILED',
        message: 'validation failed',
      }),
    )

    await expect(api('/accounts')).rejects.toBeInstanceOf(InvalidPayloadError)
    await expect(api('/accounts')).rejects.toMatchObject({ code: 'invalid-payload' })
  })

  it('maps 400 with INVALID_REQUEST to InvalidPayloadError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(400, {
        code: 'INVALID_REQUEST',
        message: 'malformed json',
      }),
    )

    await expect(api('/accounts')).rejects.toBeInstanceOf(InvalidPayloadError)
  })

  it('maps 404 with ACCOUNT_NOT_FOUND to NotFoundError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(404, {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'account not found',
      }),
    )

    await expect(api('/accounts/acc_1')).rejects.toBeInstanceOf(NotFoundError)
    await expect(api('/accounts/acc_1')).rejects.toMatchObject({ code: 'not-found' })
  })

  it('maps 409 with ACCOUNT_IN_USE to ReferentialIntegrityError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(409, {
        code: 'ACCOUNT_IN_USE',
        message: 'account has referencing transactions',
      }),
    )

    await expect(api('/accounts/acc_1', { method: 'DELETE' })).rejects.toBeInstanceOf(
      ReferentialIntegrityError,
    )
    await expect(
      api('/accounts/acc_1', { method: 'DELETE' }),
    ).rejects.toMatchObject({ code: 'has-references' })
  })

  it('maps 422 with INVALID_REFS to UnknownReferencesError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(422, {
        code: 'INVALID_REFS',
        message: 'invalid references',
      }),
    )

    await expect(api('/transactions', { method: 'POST', body: {} })).rejects.toBeInstanceOf(
      UnknownReferencesError,
    )
    await expect(
      api('/transactions', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({ code: 'unknown-references' })
  })

  it('maps 422 with ACCOUNT_NOT_FOUND (FK context) to UnknownReferencesError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(422, {
        code: 'ACCOUNT_NOT_FOUND',
        message: 'referenced account does not exist',
      }),
    )

    await expect(
      api('/transactions', { method: 'POST', body: {} }),
    ).rejects.toBeInstanceOf(UnknownReferencesError)
  })

  it('maps 422 with SAME_ACCOUNT_TRANSFER to InvalidPayloadError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(422, {
        code: 'SAME_ACCOUNT_TRANSFER',
        message: 'from and to accounts must differ',
      }),
    )

    await expect(
      api('/transactions', { method: 'POST', body: {} }),
    ).rejects.toBeInstanceOf(InvalidPayloadError)
  })

  it('maps 422 with CATEGORY_TYPE_MISMATCH to InvalidPayloadError', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(422, {
        code: 'CATEGORY_TYPE_MISMATCH',
        message: 'category type does not match transaction type',
      }),
    )

    await expect(
      api('/transactions', { method: 'POST', body: {} }),
    ).rejects.toBeInstanceOf(InvalidPayloadError)
  })

  it('does NOT map 500 INTERNAL_ERROR (FetchError propagates)', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(500, {
        code: 'INTERNAL_ERROR',
        message: 'boom',
      }),
    )

    const error = await api('/accounts').catch((e) => e)
    expect(error).toBeInstanceOf(FetchError)
    expect(error).not.toBeInstanceOf(NotFoundError)
    expect(error).not.toBeInstanceOf(InvalidPayloadError)
  })

  it('does NOT map 403 FORBIDDEN (FetchError propagates)', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(403, {
        code: 'FORBIDDEN',
        message: 'cannot edit default category',
      }),
    )

    const error = await api('/categories/cat_1', { method: 'PATCH' }).catch((e) => e)
    expect(error).toBeInstanceOf(FetchError)
    expect(error).not.toBeInstanceOf(InvalidPayloadError)
  })

  it('passes successful responses through unchanged', async () => {
    fetchSpy.mockImplementation(
      mockJsonResponse(200, [{ id: 'acc_1', name: 'Main', balance: 0 }]),
    )

    const result = await api('/accounts')
    expect(result).toEqual([{ id: 'acc_1', name: 'Main', balance: 0 }])
  })
})
