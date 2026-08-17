// Create-category form behavior: submit-driven name validation, payload
// with the picked type/icon/color, server errors at the root slot with the
// name preserved, reset after success, and pending blocking duplicates.
// The form renders standalone - under jest the @gorhom mock degrades
// BottomSheetInput to a plain input (no sheet context needed).

import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { QueryClientProvider } from '@tanstack/react-query'
import { AlreadyExistsError, type Category } from '@expense-tracker/api'
import { ThemeProvider } from '@/shared/config/theme'
import { createQueryClient } from '@/shared/lib/query/query-client'
import { CategoryRepositoryProvider } from '@/entities/category/api/repository'
import { createMockCategoryRepository } from '@/entities/category/model/mock-repository'
import { NewCategoryForm } from './new-category-form'

type MockRepository = ReturnType<typeof createMockCategoryRepository>

function renderForm(repository?: MockRepository) {
  const repo = repository ?? createMockCategoryRepository([])
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CategoryRepositoryProvider repository={repo}>
        <ThemeProvider>
          <NewCategoryForm />
        </ThemeProvider>
      </CategoryRepositoryProvider>
    </QueryClientProvider>,
  )
  return repo
}

function fillValid() {
  fireEvent.changeText(screen.getByTestId('home-new-category-name'), 'Транспорт')
  fireEvent.press(screen.getByTestId('home-new-category-type-income'))
  fireEvent.press(screen.getByTestId('home-new-category-icon-bus'))
  fireEvent.press(screen.getByTestId('home-new-category-color-6366f1'))
}

describe('NewCategoryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('blocks an empty submit with the name error and no create call', async () => {
    const repository = renderForm()

    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    expect(await screen.findByTestId('home-new-category-name-error')).toHaveTextContent(
      'Введите название категории',
    )
    expect(repository.snapshot()).toHaveLength(0)
  })

  it('submits the name with the picked type, icon, and color', async () => {
    const repository = renderForm()

    fillValid()
    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    await waitFor(() => expect(repository.snapshot()).toHaveLength(1))
    expect(repository.snapshot()[0]).toMatchObject({
      name: 'Транспорт',
      type: 'income',
      icon: 'bus',
      color: '#6366f1',
    })
  })

  it('surfaces a repository error at the root slot and keeps the name', async () => {
    const repository = {
      ...createMockCategoryRepository([]),
      create: () => Promise.reject(new AlreadyExistsError('Category exists')),
    }
    renderForm(repository)

    fireEvent.changeText(screen.getByTestId('home-new-category-name'), 'Транспорт')
    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('home-new-category-error')).toHaveTextContent('Уже существует'),
    )
    expect(screen.getByTestId('home-new-category-name').props.value).toBe('Транспорт')
  })

  it('resets the fields after a successful submit', async () => {
    const repository = renderForm()

    fillValid()
    fireEvent.press(screen.getByTestId('home-new-category-submit'))
    await waitFor(() => expect(repository.snapshot()).toHaveLength(1))

    expect(screen.getByTestId('home-new-category-name').props.value).toBe('')
    // The pickers returned to their defaults: a second submit without
    // touching them creates an expense category with the default look.
    fireEvent.changeText(screen.getByTestId('home-new-category-name'), 'Другая')
    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    await waitFor(() => expect(repository.snapshot()).toHaveLength(2))
    expect(repository.snapshot()[1]).toMatchObject({
      name: 'Другая',
      type: 'expense',
      icon: 'pricetag',
      color: '#7c5cff',
    })
  })

  it('blocks a double submit while the create is pending', async () => {
    let resolveCreate: (category: Category) => void = () => {}
    const create = jest.fn(() => new Promise<Category>((resolve) => void (resolveCreate = resolve)))
    const repository = { ...createMockCategoryRepository([]), create }
    renderForm(repository)

    fillValid()
    fireEvent.press(screen.getByTestId('home-new-category-submit'))

    await waitFor(() =>
      expect(screen.getByTestId('home-new-category-submit').props.accessibilityState.disabled).toBe(
        true,
      ),
    )
    fireEvent.press(screen.getByTestId('home-new-category-submit'))
    expect(create).toHaveBeenCalledTimes(1)

    resolveCreate({
      id: 'cat-new',
      name: 'Транспорт',
      type: 'income',
      icon: 'bus',
      color: '#6366f1',
      version: 1,
    })
  })
})
