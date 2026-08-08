import { ofetch } from 'ofetch'
import { API_BASE_URL } from '../config/app'
import {
  InvalidPayloadError,
  NotFoundError,
  ReferentialIntegrityError,
  UnknownReferencesError,
} from '@/shared/lib/data'

const UNKNOWN_REF_CODES = new Set([
  'INVALID_REFS',
  'ACCOUNT_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
])

type ApiErrorBody = {
  code?: string
  message?: string
}

export const api = ofetch.create({
  baseURL: API_BASE_URL,
  mode: 'cors',
  async onResponseError({ response }) {
    const status = response.status
    const body = (response._data ?? {}) as ApiErrorBody
    const message = body.message ?? `HTTP ${status}`

    if (status === 404) throw new NotFoundError(message)
    if (status === 409) throw new ReferentialIntegrityError(message)
    if (status === 400) throw new InvalidPayloadError(message)
    if (status === 422) {
      if (body.code && UNKNOWN_REF_CODES.has(body.code)) {
        throw new UnknownReferencesError(message)
      }
      throw new InvalidPayloadError(message)
    }
  },
})
