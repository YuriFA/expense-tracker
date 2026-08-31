import { describe, expect, it } from 'vitest'
import { isRouteActive } from './route-active'

describe('isRouteActive', () => {
  it('matches a route by name prefix', () => {
    expect(isRouteActive('analytics-detail', 'analytics')).toBe(true)
    expect(isRouteActive('analytics', 'analytics')).toBe(true)
  })

  it('does not match a different section or a non-string name', () => {
    expect(isRouteActive('analytics-detail', 'accounts')).toBe(false)
    expect(isRouteActive(undefined, 'home')).toBe(false)
  })
})
