import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { TRANSACTION_REPOSITORY_KEY, useTransactionRepository } from './repository'
import { createMockTransactionRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('useTransactionRepository', () => {
  it('returns repository when provided', () => {
    const mockRepo = createMockTransactionRepository()
    let captured: unknown = null
    const TestComponent = defineComponent({
      setup() {
        captured = useTransactionRepository()
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent, {
      repositories: { transactions: mockRepo },
    })
    expect(captured).toBe(mockRepo)
  })

  it('throws when repository is not provided', () => {
    const captured: { error: Error | null } = { error: null }
    const TestComponent = defineComponent({
      setup() {
        try {
          useTransactionRepository()
        } catch (e) {
          captured.error = e as Error
        }
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent)
    expect(captured.error?.message).toMatch(/not provided/)
    expect(typeof TRANSACTION_REPOSITORY_KEY).toBe('symbol')
  })
})
