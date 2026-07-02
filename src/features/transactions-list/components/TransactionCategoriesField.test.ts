import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { Form as VeeForm } from 'vee-validate'
import TransactionCategoriesField from './TransactionCategoriesField.vue'
import type { Category } from '@/entities/category/types'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categories: Category[] = [
  { id: 'cincome', name: 'Salary', type: 'income', icon: '💰', color: '#00FF00' },
  { id: 'cexpense', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' },
]

describe('TransactionCategoriesField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts inside Form context', async () => {
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue(categories)
    const Wrapper = defineComponent({
      setup() {
        return () => h(VeeForm, { onSubmit: vi.fn() }, () => h(TransactionCategoriesField))
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { categories: categoriesRepo } })
    await flushPromises()
    expect(wrapper.find('button#category-id').exists()).toBe(true)
  })
})
