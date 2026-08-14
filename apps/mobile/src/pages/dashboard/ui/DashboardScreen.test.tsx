import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@/shared/config/theme'
import { CategorySection } from './CategorySection'
import { DashboardScreen } from './DashboardScreen'
import { formatAmount } from '../model/format'
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS } from '../model/mock-data'
import {
  currentMonth,
  expensesInMonth,
  monthlyBalance,
  previousMonth,
  totalBalance,
  totalExpenses,
} from '../model/selectors'
import { BottomSheetProvider } from '@/shared/ui/bottom-sheet/bottom-sheet-provider'

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <BottomSheetProvider>{ui}</BottomSheetProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

const expensesRowCount = () => screen.queryAllByTestId(/^home-expense-row-/).length

describe('DashboardScreen (Home)', () => {
  it('renders the sections with the expenses total for the current month', () => {
    renderWithProviders(<DashboardScreen />)

    expect(screen.getByTestId('screen-dashboard')).toBeTruthy()
    expect(screen.getByTestId('home-quick-accounts')).toBeTruthy()
    expect(screen.getByTestId('home-quick-income')).toBeTruthy()
    expect(screen.getByTestId('home-quick-goals')).toBeTruthy()

    expect(screen.getByText('Расходы')).toBeTruthy()
    const expected = formatAmount(totalExpenses(MOCK_TRANSACTIONS, currentMonth()))
    expect(screen.getByText(expected)).toBeTruthy()

    expect(screen.getByText('Все расходы')).toBeTruthy()
    expect(screen.getByTestId('home-new-category')).toBeTruthy()
  })

  it('switches the summary mode via the bottom sheet', () => {
    renderWithProviders(<DashboardScreen />)

    fireEvent.press(screen.getByTestId('home-summary-mode'))
    expect(screen.getByTestId('home-mode-sheet')).toBeTruthy()

    fireEvent.press(screen.getByTestId('home-mode-option-total-balance'))
    // Sheet closed, header now shows the mode title and the total balance.
    expect(screen.queryByTestId('home-mode-sheet')).toBeNull()
    expect(screen.getByText('Баланс общий')).toBeTruthy()
    expect(
      screen.getByText(formatAmount(totalBalance(MOCK_ACCOUNTS, MOCK_TRANSACTIONS))),
    ).toBeTruthy()

    fireEvent.press(screen.getByTestId('home-summary-mode'))
    fireEvent.press(screen.getByTestId('home-mode-option-monthly-balance'))
    expect(
      screen.getByText(formatAmount(monthlyBalance(MOCK_TRANSACTIONS, currentMonth()))),
    ).toBeTruthy()
  })

  it('navigates to the previous month and disables future navigation', () => {
    renderWithProviders(<DashboardScreen />)

    expect(screen.getByTestId('home-period-next').props.accessibilityState.disabled).toBe(true)

    fireEvent.press(screen.getByTestId('home-period-prev'))
    const prev = previousMonth(currentMonth())
    expect(screen.getByText(formatAmount(totalExpenses(MOCK_TRANSACTIONS, prev)))).toBeTruthy()
    expect(screen.getByTestId('home-period-next').props.accessibilityState.disabled).toBe(false)
  })

  it('shows the empty state for a month without expenses', () => {
    renderWithProviders(<DashboardScreen />)

    // Current and previous months have data; the month before is empty.
    fireEvent.press(screen.getByTestId('home-period-prev'))
    fireEvent.press(screen.getByTestId('home-period-prev'))
    // The empty message appears in both the "Все расходы" card and the
    // category section - the layout stays stable, no sections hidden.
    expect(screen.getAllByText('В этом месяце расходов нет').length).toBe(2)
  })

  it('opens the all-expenses sheet with the period expenses and closes via scrim', () => {
    renderWithProviders(<DashboardScreen />)

    fireEvent.press(screen.getByTestId('home-all-expenses'))
    const expectedCount = expensesInMonth(MOCK_TRANSACTIONS, currentMonth()).length
    expect(expensesRowCount()).toBe(expectedCount)

    fireEvent.press(screen.getByTestId('home-expenses-sheet-scrim'))
    expect(screen.queryByTestId('home-expenses-sheet')).toBeNull()
  })

  it('opens a category-filtered expense sheet', () => {
    renderWithProviders(<DashboardScreen />)

    fireEvent.press(screen.getByTestId('home-category-cat-taxi'))
    expect(screen.getByTestId('home-expenses-sheet')).toBeTruthy()
    expect(expensesRowCount()).toBe(
      expensesInMonth(MOCK_TRANSACTIONS, currentMonth()).filter((t) => t.categoryId === 'cat-taxi')
        .length,
    )
  })

  it('enables the create-category submit only after a name is entered', () => {
    renderWithProviders(<DashboardScreen />)

    fireEvent.press(screen.getByTestId('home-new-category'))
    expect(screen.getByTestId('home-new-category-submit').props.accessibilityState.disabled).toBe(
      true,
    )

    fireEvent.changeText(screen.getByTestId('home-new-category-name'), 'Транспорт')
    expect(screen.getByTestId('home-new-category-submit').props.accessibilityState.disabled).toBe(
      false,
    )

    fireEvent.press(screen.getByTestId('home-new-category-type-income'))
    fireEvent.press(screen.getByTestId('home-new-category-submit'))
    expect(screen.queryByTestId('home-new-category-sheet')).toBeNull()
  })
})

describe('CategorySection (empty states)', () => {
  it('offers category creation when the user has none', () => {
    renderWithProviders(
      <CategorySection
        rows={[]}
        hasAnyCategories={false}
        onNewCategory={jest.fn()}
        onCategoryPress={jest.fn()}
      />,
    )
    expect(screen.getByText('Нет категорий')).toBeTruthy()
    expect(screen.getByText('Создать категорию')).toBeTruthy()
  })
})
