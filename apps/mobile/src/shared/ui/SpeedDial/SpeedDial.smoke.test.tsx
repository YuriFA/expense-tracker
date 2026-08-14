import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@/shared/config/theme'
import { SpeedDial, type SpeedDialAction } from '../SpeedDial'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  )
}

const actions: SpeedDialAction[] = [
  { id: 'a', icon: null, onPress: jest.fn() },
  { id: 'b', icon: null, onPress: jest.fn() },
]

const fab = () => screen.getByTestId('speed-dial-fab')
const fabExpanded = () => Boolean(fab().props.accessibilityState?.expanded)

// The shared `progress` value is the single source of truth, so rapid toggling
// must never throw or desync the observed state.
describe('SpeedDial · rapid open/close', () => {
  it('survives rapid FAB toggling and ends in the correct state', () => {
    renderWithProviders(<SpeedDial actions={actions} />)
    const f = fab()
    fireEvent.press(f) // open
    fireEvent.press(f) // close
    fireEvent.press(f) // open
    fireEvent.press(f) // close
    fireEvent.press(f) // open
    expect(fabExpanded()).toBe(true)
  })

  it('survives rapid open + backdrop + reopen', () => {
    renderWithProviders(<SpeedDial actions={actions} />)
    fireEvent.press(fab())
    fireEvent.press(screen.getByTestId('speed-dial-backdrop'))
    fireEvent.press(fab())
    fireEvent.press(screen.getByTestId('speed-dial-backdrop'))
    fireEvent.press(fab())
    expect(fabExpanded()).toBe(true)
  })
})
