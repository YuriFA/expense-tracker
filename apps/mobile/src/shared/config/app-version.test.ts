import { describe, expect, it } from '@jest/globals'

import { resolveAppVersion } from './app-version'

describe('resolveAppVersion', () => {
  it('prefers the embedded manifest version', () => {
    expect(resolveAppVersion('1.2.0', '9.9.9')).toBe('1.2.0')
  })

  it('falls back to the native application version without a manifest', () => {
    expect(resolveAppVersion(undefined, '3.1.4')).toBe('3.1.4')
  })

  it('falls back to dev when neither source is present', () => {
    expect(resolveAppVersion(undefined, undefined)).toBe('dev')
    expect(resolveAppVersion('', '')).toBe('dev')
  })
})
