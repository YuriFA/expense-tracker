import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { useAccountRepository, ACCOUNT_REPOSITORY_KEY } from './repository'
import { createMockAccountRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('useAccountRepository', () => {
  it('returns repository when provided', () => {
    const mockRepo = createMockAccountRepository()
    let captured: unknown = null
    const TestComponent = defineComponent({
      setup() {
        captured = useAccountRepository()
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent, {
      repositories: { accounts: mockRepo },
    })
    expect(captured).toBe(mockRepo)
  })

  it('throws with helpful message when key is not provided', () => {
    const captured: { error: Error | null } = { error: null }
    const TestComponent = defineComponent({
      setup() {
        try {
          useAccountRepository()
        } catch (e) {
          captured.error = e as Error
        }
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent)
    expect(captured.error?.message).toMatch(/not provided/)
    expect(typeof ACCOUNT_REPOSITORY_KEY).toBe('symbol')
  })
})
