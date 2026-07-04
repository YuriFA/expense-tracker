import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CategorySelect from './CategorySelect.vue'
import type { Category } from '../model/types'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categories: Category[] = [
  { id: 'cincome', name: 'Salary', type: 'income', icon: '💰', color: '#00FF00' },
  { id: 'cexpense', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000' },
]

const baseProps = {
  label: 'Category',
  placeholder: 'Select category',
  inputId: 'category-id',
}

function mountField(props: Record<string, unknown> = {}, repositories: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(CategorySelect, { ...baseProps, ...props })
    },
  })
  return mountWithProviders(Wrapper, { repositories })
}

describe('CategorySelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders select trigger with given inputId', async () => {
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue(categories)
    const wrapper = mountField({}, { categories: categoriesRepo })
    await flushPromises()
    expect(wrapper.find('button#category-id').exists()).toBe(true)
  })

  it('renders FieldLabel', async () => {
    const wrapper = mountField()
    await flushPromises()
    expect(wrapper.find('label[for="category-id"]').exists()).toBe(true)
  })

  it('renders Select component', async () => {
    const wrapper = mountField()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'Select' }).exists()).toBe(true)
  })

  it('reflects modelValue in Select', async () => {
    const wrapper = mountField({ modelValue: 'cincome' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'Select' }).props('modelValue')).toBe('cincome')
  })
})
