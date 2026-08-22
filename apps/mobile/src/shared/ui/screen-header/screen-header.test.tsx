import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@/shared/config/theme'
import { Screen } from '@/shared/ui/screen'
import { LARGE_TITLE_ZONE } from './constants'
import { ScreenHeader, type ScreenHeaderProps } from './screen-header'
import { ScreenScrollView } from './screen-scroll-view'

const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }))

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

function renderHeader(overrides: Partial<ScreenHeaderProps> = {}, topInset = 0) {
  render(
    <SafeAreaProvider
      initialMetrics={{
        insets: { ...ZERO_INSETS, top: topInset },
        frame: { x: 0, y: 0, width: 375, height: 812 },
      }}
    >
      <ThemeProvider>
        <Screen topInset={false}>
          <ScreenHeader title="Счета" {...overrides} />
          <ScreenScrollView testID="body-scroll">
            <View />
          </ScreenScrollView>
        </Screen>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

/** Scroll events reach the header through the wired ScreenScrollView. */
function scrollBody(y: number) {
  fireEvent.scroll(screen.getByTestId('body-scroll'), { contentOffset: { y } })
}

// RNTL queries skip a11y-hidden elements, so reachability IS the a11y
// assertion: exactly one of the two title nodes is reachable at a time.
const largeTitleReachable = () => screen.queryByTestId('screen-header-large-title') !== null
const compactTitleReachable = () => screen.queryByTestId('screen-header-compact-title') !== null

describe('ScreenHeader', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  it('renders the title expanded at the top and hides the compact copy from a11y', () => {
    renderHeader()

    expect(screen.getByTestId('screen-header')).toBeTruthy()
    expect(screen.getByText('Счета')).toBeTruthy()
    expect(largeTitleReachable()).toBe(true)
    expect(compactTitleReachable()).toBe(false)
  })

  it('shows the back button by default and returns via the router', () => {
    renderHeader()

    fireEvent.press(screen.getByTestId('screen-header-back'))
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('hides the back button with showBack={false}', () => {
    renderHeader({ showBack: false })

    expect(screen.queryByTestId('screen-header-back')).toBeNull()
  })

  it('prefers a custom onBack over the router default', () => {
    const onBack = jest.fn()
    renderHeader({ onBack })

    fireEvent.press(screen.getByTestId('screen-header-back'))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('renders the trailing action slot', () => {
    renderHeader({ right: <View testID="right-action" /> })

    expect(screen.getByTestId('right-action')).toBeTruthy()
  })

  it('collapses past the scroll threshold and re-expands back at the top', () => {
    renderHeader()

    // Intermediate scroll: still expanded (no state flip per scroll event).
    scrollBody(LARGE_TITLE_ZONE / 2)
    expect(largeTitleReachable()).toBe(true)

    // Past the threshold the compact title becomes the announced one.
    scrollBody(LARGE_TITLE_ZONE + 1)
    expect(largeTitleReachable()).toBe(false)
    expect(compactTitleReachable()).toBe(true)

    // Returning to the top restores the large title.
    scrollBody(0)
    expect(largeTitleReachable()).toBe(true)
    expect(compactTitleReachable()).toBe(false)
  })

  it('renders with a non-zero top safe-area inset (notch / Dynamic Island)', () => {
    renderHeader({}, 59)

    expect(screen.getByTestId('screen-header')).toBeTruthy()
    expect(screen.getByText('Счета')).toBeTruthy()
  })
})
