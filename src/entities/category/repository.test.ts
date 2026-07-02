import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { CATEGORY_REPOSITORY_KEY, useCategoryRepository } from './repository'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

describe('useCategoryRepository', () => {
  it('returns repository when provided', () => {
    const mockRepo = createMockCategoryRepository()
    let captured: unknown = null
    const TestComponent = defineComponent({
      setup() {
        captured = useCategoryRepository()
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent, {
      repositories: { categories: mockRepo },
    })
    expect(captured).toBe(mockRepo)
  })

  it('throws when repository is not provided', () => {
    const captured: { error: Error | null } = { error: null }
    const TestComponent = defineComponent({
      setup() {
        try {
          useCategoryRepository()
        } catch (e) {
          captured.error = e as Error
        }
        return {}
      },
      template: '<div />',
    })
    mountWithProviders(TestComponent)
    expect(captured.error?.message).toMatch(/not provided/)
    expect(typeof CATEGORY_REPOSITORY_KEY).toBe('symbol')
  })
})
