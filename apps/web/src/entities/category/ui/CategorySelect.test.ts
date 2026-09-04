import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import CategorySelect from './CategorySelect.vue'
import type { Category } from '../model/types'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import { DESKTOP_PRESENTATION_KEY } from '@/shared/lib/presentation'

const categories: Category[] = [
  {
    id: 'cincome',
    name: 'Salary',
    type: 'income',
    icon: '💰',
    color: '#00FF00',
    archivedAt: null,
    slug: 'salary',
    version: 1,
  },
  {
    id: 'cexpense',
    name: 'Food',
    type: 'expense',
    icon: '🍔',
    color: '#FF0000',
    archivedAt: null,
    slug: 'food',
    version: 1,
  },
]

const archivedCategory: Category = {
  id: 'carchived',
  name: 'Subscriptions',
  type: 'expense',
  icon: '🔁',
  color: '#0d9488',
  archivedAt: '2026-08-01T00:00:00.000Z',
  slug: 'subscriptions',
  version: 2,
}

const baseProps = {
  label: 'Category',
  placeholder: 'Select category',
  inputId: 'category-id',
}

function mountField(
  props: Record<string, unknown> = {},
  repositories: Record<string, unknown> = {},
) {
  const Wrapper = defineComponent({
    setup() {
      return () => h(CategorySelect, { ...baseProps, ...props })
    },
  })
  return mountWithProviders(Wrapper, {
    repositories,
    global: {
      provide: {
        [DESKTOP_PRESENTATION_KEY]: ref(true),
      },
    },
  })
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

  it('reflects modelValue in Select', async () => {
    const wrapper = mountField({ modelValue: 'cincome' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ResponsiveSelect' }).props('modelValue')).toBe('cincome')
  })

  // Archive spec: pickers offer only active categories, but an already
  // assigned archived category keeps resolving its label in the trigger
  // (editing a transaction that keeps its category).
  it('resolves an archived current value while offering only active options', async () => {
    const categoriesRepo = createMockCategoryRepository()
    categoriesRepo.getAllIncludingArchived.mockResolvedValue([...categories, archivedCategory])
    const wrapper = mountField({ modelValue: 'carchived' }, { categories: categoriesRepo })
    await flushPromises()

    expect(wrapper.text()).toContain('Subscriptions')

    // Open the dropdown (reka opens on Enter in jsdom): only active
    // categories are offered.
    await wrapper.find('button#category-id').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    const options = document.body.textContent ?? ''
    expect(options).toContain('Food')
    expect(options).not.toContain('Subscriptions')
  })
})
