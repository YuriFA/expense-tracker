import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '@/shared/config/theme'
import { SpeedDial, type SpeedDialAction } from '../speed-dial'
import { DEFAULT_EDGE_MARGIN } from './constants'

// --- Shared fixtures & helpers ------------------------------------------------

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

/** SpeedDial needs SafeAreaProvider (insets) + ThemeProvider (icon color). */
function renderWithProviders(ui: React.ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  )
}

const icon = (label: string) => <Text>{label}</Text>

const threeActions: SpeedDialAction[] = [
  { id: 'expense', label: 'Expense', icon: icon('minus'), onPress: jest.fn() },
  { id: 'income', label: 'Income', icon: icon('plus'), onPress: jest.fn() },
  { id: 'transfer', label: 'Transfer', icon: icon('swap'), onPress: jest.fn() },
]

const fab = () => screen.getByTestId('speed-dial-fab')
/** Whether the FAB reports the expanded a11y state (open/closed source of truth). */
const fabExpanded = () => Boolean(fab().props.accessibilityState?.expanded)
const openMenu = () => fireEvent.press(fab())

// --- State --------------------------------------------------------------------

describe('SpeedDial · state', () => {
  it('is initially closed', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    expect(fabExpanded()).toBe(false)
  })

  it('opens on FAB press', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    expect(fabExpanded()).toBe(true)
  })

  it('closes on a second FAB press', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    openMenu()
    expect(fabExpanded()).toBe(false)
  })
})

// --- Interaction --------------------------------------------------------------

describe('SpeedDial · interaction', () => {
  it('pressing the backdrop closes the menu', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    fireEvent.press(screen.getByTestId('speed-dial-backdrop'))
    expect(fabExpanded()).toBe(false)
  })

  it('pressing an action invokes its callback', () => {
    const onPress = jest.fn()
    renderWithProviders(<SpeedDial actions={[{ id: 'expense', icon: icon('minus'), onPress }]} />)
    openMenu()
    fireEvent.press(screen.getByTestId('speed-dial-action-expense'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('pressing an action closes the menu', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    fireEvent.press(screen.getByTestId('speed-dial-action-income'))
    expect(fabExpanded()).toBe(false)
  })

  it('exposes the actions only while the menu is open', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    // While closed the actions are mounted but hidden from accessibility
    // (RNTL queries skip a11y-hidden elements); they become reachable once
    // open (interactivity itself is covered by the callback tests above).
    expect(screen.queryByTestId('speed-dial-action-expense')).toBeNull()
    openMenu()
    expect(screen.getByTestId('speed-dial-action-expense')).toBeTruthy()
  })
})

// --- Accessibility ------------------------------------------------------------

describe('SpeedDial · accessibility', () => {
  it('the FAB is a button with the closed label', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    const f = fab()
    expect(f.props.accessibilityRole).toBe('button')
    expect(f.props.accessibilityLabel).toBe('More actions')
    expect(f.props.accessibilityState.expanded).toBe(false)
  })

  it('the FAB label becomes the close label when open', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    const f = fab()
    expect(f.props.accessibilityLabel).toBe('Close actions')
    expect(f.props.accessibilityState.expanded).toBe(true)
  })

  it('honors custom label / closeLabel', () => {
    renderWithProviders(<SpeedDial actions={threeActions} label="Add" closeLabel="Dismiss" />)
    expect(fab().props.accessibilityLabel).toBe('Add')
    openMenu()
    expect(fab().props.accessibilityLabel).toBe('Dismiss')
  })

  it('each action is a labeled button', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    const action = screen.getByTestId('speed-dial-action-income')
    expect(action.props.accessibilityRole).toBe('button')
    expect(action.props.accessibilityLabel).toBe('Income')
  })

  it('prefers accessibilityLabel over label when both are given', () => {
    renderWithProviders(
      <SpeedDial
        actions={[
          {
            id: 'income',
            label: 'Income',
            accessibilityLabel: 'Add income',
            icon: icon('plus'),
            onPress: jest.fn(),
          },
        ]}
      />,
    )
    openMenu()
    expect(screen.getByTestId('speed-dial-action-income').props.accessibilityLabel).toBe(
      'Add income',
    )
  })

  it('an action falls back to id for its label when none is given', () => {
    renderWithProviders(
      <SpeedDial actions={[{ id: 'create', icon: icon('c'), onPress: jest.fn() }]} />,
    )
    openMenu()
    expect(screen.getByTestId('speed-dial-action-create').props.accessibilityLabel).toBe('create')
  })

  it('the backdrop is hidden from accessibility while closed', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    expect(screen.queryByTestId('speed-dial-backdrop')).toBeNull()
    openMenu()
    expect(screen.getByTestId('speed-dial-backdrop')).toBeTruthy()
  })
})

// --- Rendering ----------------------------------------------------------------

describe('SpeedDial · rendering', () => {
  it('renders with zero actions (FAB only)', () => {
    renderWithProviders(<SpeedDial actions={[]} />)
    expect(fab()).toBeTruthy()
    openMenu()
    expect(screen.queryByTestId('speed-dial-action-anything')).toBeNull()
  })

  it('renders a single action', () => {
    renderWithProviders(
      <SpeedDial actions={[{ id: 'solo', icon: icon('s'), onPress: jest.fn() }]} />,
    )
    openMenu()
    expect(screen.getByTestId('speed-dial-action-solo')).toBeTruthy()
  })

  it('renders every action testID for multiple actions', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    for (const id of ['expense', 'income', 'transfer']) {
      expect(screen.getByTestId(`speed-dial-action-${id}`)).toBeTruthy()
    }
  })

  it('renders action labels', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    expect(screen.getByText('Expense')).toBeTruthy()
    expect(screen.getByText('Income')).toBeTruthy()
    expect(screen.getByText('Transfer')).toBeTruthy()
  })

  it('renders custom icons', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    expect(screen.getByText('minus')).toBeTruthy()
  })
})

// --- Centered anchoring (the tab-bar FAB use case) ----------------------------

/** Walk up from the FAB to its absolute-positioned container (the anchor View). */
const fabContainer = () => {
  let node = fab().parent
  while (node) {
    const s = node.props.style
    if (s && s.position === 'absolute' && typeof s.bottom === 'number') return node
    node = node.parent
  }
  throw new Error('FAB positioning container not found')
}

describe('SpeedDial · centered anchoring', () => {
  it('spans the full width and self-centers the FAB container', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    const style = fabContainer().props.style
    expect(style.left).toBe(0)
    expect(style.right).toBe(0)
    expect(style.alignItems).toBe('center')
  })

  it('defaults the bottom offset to safe-area inset + edge margin', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    // Zero insets -> safe-area bottom (0) + DEFAULT_EDGE_MARGIN.
    expect(fabContainer().props.style.bottom).toBe(DEFAULT_EDGE_MARGIN)
  })

  it('honors an explicit bottomOffset (tab-bar straddle)', () => {
    renderWithProviders(<SpeedDial actions={threeActions} bottomOffset={42} />)
    expect(fabContainer().props.style.bottom).toBe(42)
  })

  it('opens, fires an action and closes in place', () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    openMenu()
    fireEvent.press(screen.getByTestId('speed-dial-action-expense'))
    expect(fabExpanded()).toBe(false)
  })
})
