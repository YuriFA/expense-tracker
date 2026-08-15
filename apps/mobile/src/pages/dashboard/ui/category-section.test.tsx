import { describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@/shared/config/theme'
import { CategorySection } from './category-section'
import { currentMonth } from '../model/selectors'

// CategorySection derives its data from the mock fixtures; empty the category
// list to reach the "no categories yet" branch (unreachable via props).
jest.mock('../model/mock-data', () => ({
  ...jest.requireActual<typeof import('../model/mock-data')>('../model/mock-data'),
  MOCK_CATEGORIES: [],
}))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

function renderSection() {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <CategorySection cursor={currentMonth()} />
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

describe('CategorySection (empty states)', () => {
  it('offers category creation when the user has none', () => {
    renderSection()
    expect(screen.getByText('Нет категорий')).toBeTruthy()
    expect(screen.getByText('Создать категорию')).toBeTruthy()
  })
})
