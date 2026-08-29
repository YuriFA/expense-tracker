import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import TransactionCategoriesField from './TransactionCategoriesField.vue'
import type { Category } from '@/entities/category'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'

const categories: Category[] = [
  { id: 'cincome', name: 'Salary', type: 'income', icon: '💰', color: '#00FF00', slug: 'salary', version: 1 },
  { id: 'cexpense', name: 'Food', type: 'expense', icon: '🍔', color: '#FF0000', slug: 'food', version: 1 },
]

describe('TransactionCategoriesField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mountField(
    options: { modelValue?: string[]; type?: 'expense' | 'income' } = {},
  ) {
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAll.mockResolvedValue(categories)
    const emitted: string[][] = []
    const Wrapper = defineComponent({
      setup() {
        const model = ref(options.modelValue)
        return () =>
          h(TransactionCategoriesField, {
            'type': options.type,
            'modelValue': model.value,
            'onUpdate:modelValue': (value: string[] | undefined) => {
              model.value = value
              emitted.push(value ?? [])
            },
          })
      },
    })
    const wrapper = mountWithProviders(Wrapper, { repositories: { categories: categoriesRepo } })
    return { wrapper, emitted }
  }

  it('renders a filter-checkbox row per category with its avatar', async () => {
    const { wrapper } = mountField()
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="transactions-filter-categories"] input')
    expect(rows.length).toBe(2)
    expect(wrapper.find('[data-testid="transactions-filter-category-cincome"]').exists()).toBe(
      true,
    )
  })

  it('filters rows by the selected transaction type', async () => {
    const { wrapper } = mountField({ type: 'expense' })
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="transactions-filter-categories"] input')
    expect(rows.length).toBe(1)
    expect(wrapper.text()).toContain('Food')
  })

  it('toggles ids into the model and back out', async () => {
    const { wrapper, emitted } = mountField()
    await flushPromises()

    await wrapper.find('[data-testid="transactions-filter-category-cexpense"]').setValue()
    expect(emitted.at(-1)).toEqual(['cexpense'])

    await wrapper.find('[data-testid="transactions-filter-category-cexpense"]').setValue(false)
    expect(emitted.at(-1)).toEqual([])
  })
})
