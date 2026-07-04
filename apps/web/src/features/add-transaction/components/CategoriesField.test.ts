import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CategoriesField from './CategoriesField.vue'
import type { Category } from '@/entities/category'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categories: Category[] = [
  { id: 'cincome', name: 'Salary', type: 'income', icon: '💰', color: '#00FF00' },
  { id: 'cexpense', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' },
]

function mountField(props: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(CategoriesField, props)
    },
  })
  return mountWithProviders(Wrapper, { repositories: {} })
}

describe('CategoriesField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders select trigger', async () => {
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue(categories)
    const Wrapper = defineComponent({
      setup() {
        return () => h(CategoriesField)
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { categories: categoriesRepo } })
    await flushPromises()
    expect(wrapper.find('button#category-id').exists()).toBe(true)
  })

  it('renders Select component', async () => {
    const wrapper = mountField()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'Select' }).exists()).toBe(true)
  })
})
