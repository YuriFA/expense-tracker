import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { Category } from '@expense-tracker/api'
import { CATEGORY_ICONS } from '@/entities/category'
import { createMockCategoryRepository } from '@/__tests__/helpers/mock-repositories'
import { mountWithProviders } from '@/__tests__/helpers/mount-with-providers'
import CategoryEditDialog from './CategoryEditDialog.vue'

const category: Category = {
  id: 'c-food',
  name: 'Food',
  type: 'expense',
  icon: '🛒',
  color: '#16a34a',
  archivedAt: null,
  version: 3,
}

const q = <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
  document.querySelector<T>(selector)

function mountDialog() {
  const categoriesRepo = createMockCategoryRepository()
  categoriesRepo.getAllIncludingArchived.mockResolvedValue([category])
  const wrapper = mountWithProviders(CategoryEditDialog, {
    props: { category, open: true },
    repositories: { categories: categoriesRepo },
  })
  return { wrapper, categoriesRepo }
}

describe('CategoryEditDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('seeds the form and shows the immutable type', async () => {
    mountDialog()
    await flushPromises()

    expect((q<HTMLInputElement>('[data-testid="edit-category-name"]')!).value).toBe('Food')
    expect(q('[data-testid="edit-category-type"]')?.textContent).toContain('Expense')
  })

  it('submits name + the picked icon with its paired color and the version', async () => {
    const { categoriesRepo } = mountDialog()
    await flushPromises()

    // Pick a different preset: 🍕 with its own paired color.
    const pizza = CATEGORY_ICONS.find((option) => option.icon === '🍕')!
    q('[data-testid="edit-category-icon-2"]')!.click()
    await flushPromises()

    const submit = q<HTMLButtonElement>('[data-testid="edit-category-submit"]')!
    submit.click()
    await flushPromises()

    expect(categoriesRepo.update).toHaveBeenCalledWith('c-food', {
      name: 'Food',
      icon: '🍕',
      color: pizza.color,
      version: 3,
    })
  })

  it('keeps the submit disabled for an empty name', async () => {
    mountDialog()
    await flushPromises()

    const input = q<HTMLInputElement>('[data-testid="edit-category-name"]')!
    input.value = '   '
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(q<HTMLButtonElement>('[data-testid="edit-category-submit"]')!.hasAttribute('disabled')).toBe(
      true,
    )
  })
})
