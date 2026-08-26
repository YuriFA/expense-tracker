import { describe, expect, it } from 'vitest'
import { configureIdFactory, generateId } from './id-factory'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('id factory', () => {
  it('defaults to WebCrypto UUID v4 (works unconfigured)', () => {
    expect(generateId()).toMatch(UUID_V4)
  })

  it('override takes effect (the Hermes bootstrap path)', () => {
    configureIdFactory(() => 'fixed-id')
    try {
      expect(generateId()).toBe('fixed-id')
    } finally {
      configureIdFactory(() => crypto.randomUUID())
    }
    expect(generateId()).toMatch(UUID_V4)
  })
})
