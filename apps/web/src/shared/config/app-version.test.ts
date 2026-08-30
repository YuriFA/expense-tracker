import { describe, expect, it } from 'vitest'

import { APP_VERSION, resolveAppVersion } from './app-version'

describe('resolveAppVersion', () => {
  it('returns the injected build version', () => {
    expect(resolveAppVersion('sha-abc1234')).toBe('sha-abc1234')
  })

  it('falls back to dev when no version was injected', () => {
    expect(resolveAppVersion(undefined)).toBe('dev')
  })

  it('APP_VERSION resolves through the build-time define', () => {
    // The Vite define replaces __APP_VERSION__ at build time; in the test
    // environment VITE_APP_VERSION is unset, so the 'dev' default applies.
    expect(APP_VERSION).toBe('dev')
  })
})
