import { describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render, screen } from "@testing-library/react-native"
import { Text } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { ThemeProvider } from "@/shared/config/theme"
import { SpeedDial, type SpeedDialAction } from "../SpeedDial"

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
  { id: "expense", label: "Expense", icon: icon("minus"), onPress: jest.fn() },
  { id: "income", label: "Income", icon: icon("plus"), onPress: jest.fn() },
  { id: "transfer", label: "Transfer", icon: icon("swap"), onPress: jest.fn() },
]

const fab = () => screen.getByTestId("speed-dial-fab")
/** Whether the FAB reports the expanded a11y state (open/closed source of truth). */
const fabExpanded = () => Boolean(fab().props.accessibilityState?.expanded)

// --- State --------------------------------------------------------------------

describe("SpeedDial · state", () => {
  it("is initially closed", () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    expect(fabExpanded()).toBe(false)
  })

  it("starts open with defaultOpen (uncontrolled)", () => {
    renderWithProviders(<SpeedDial actions={threeActions} defaultOpen />)
    expect(fabExpanded()).toBe(true)
  })

  it("reflects controlled open state", () => {
    const { rerender } = renderWithProviders(<SpeedDial actions={threeActions} open={false} />)
    expect(fabExpanded()).toBe(false)
    rerender(
      <SafeAreaProvider initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}>
        <ThemeProvider>
          <SpeedDial actions={threeActions} open />
        </ThemeProvider>
      </SafeAreaProvider>,
    )
    expect(fabExpanded()).toBe(true)
  })

  it("calls onOpenChange when toggled", () => {
    const onOpenChange = jest.fn()
    renderWithProviders(
      <SpeedDial actions={threeActions} onOpenChange={onOpenChange} />,
    )
    fireEvent.press(fab())
    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    fireEvent.press(fab())
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it("opens on FAB press (uncontrolled)", () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    fireEvent.press(fab())
    expect(fabExpanded()).toBe(true)
  })

  it("closes on a second FAB press (uncontrolled)", () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    fireEvent.press(fab())
    fireEvent.press(fab())
    expect(fabExpanded()).toBe(false)
  })
})

// --- Interaction --------------------------------------------------------------

describe("SpeedDial · interaction", () => {
  it("pressing the backdrop closes the menu", () => {
    renderWithProviders(<SpeedDial actions={threeActions} defaultOpen />)
    fireEvent.press(screen.getByTestId("speed-dial-backdrop"))
    expect(fabExpanded()).toBe(false)
  })

  it("pressing an action invokes its callback", () => {
    const onPress = jest.fn()
    renderWithProviders(
      <SpeedDial
        defaultOpen
        actions={[{ id: "expense", icon: icon("minus"), onPress }]}
      />,
    )
    fireEvent.press(screen.getByTestId("speed-dial-action-expense"))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("pressing an action closes the menu", () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    fireEvent.press(fab()) // open
    fireEvent.press(screen.getByTestId("speed-dial-action-income"))
    expect(fabExpanded()).toBe(false)
  })

  it("a disabled SpeedDial does not open", () => {
    renderWithProviders(<SpeedDial actions={threeActions} disabled />)
    fireEvent.press(fab())
    expect(fabExpanded()).toBe(false)
  })

  it("a disabled action does not invoke its callback", () => {
    const onPress = jest.fn()
    renderWithProviders(
      <SpeedDial
        defaultOpen
        actions={[{ id: "x", icon: icon("x"), disabled: true, onPress }]}
      />,
    )
    fireEvent.press(screen.getByTestId("speed-dial-action-x"))
    expect(onPress).not.toHaveBeenCalled()
  })
})

// --- Accessibility ------------------------------------------------------------

describe("SpeedDial · accessibility", () => {
  it("the FAB is a button with the closed label", () => {
    renderWithProviders(<SpeedDial actions={threeActions} />)
    const f = fab()
    expect(f.props.accessibilityRole).toBe("button")
    expect(f.props.accessibilityLabel).toBe("More actions")
    expect(f.props.accessibilityState.expanded).toBe(false)
  })

  it("the FAB label becomes the close label when open", () => {
    renderWithProviders(<SpeedDial actions={threeActions} defaultOpen />)
    const f = fab()
    expect(f.props.accessibilityLabel).toBe("Close actions")
    expect(f.props.accessibilityState.expanded).toBe(true)
  })

  it("honors custom label / closeLabel", () => {
    renderWithProviders(
      <SpeedDial actions={threeActions} label="Add" closeLabel="Dismiss" />,
    )
    expect(fab().props.accessibilityLabel).toBe("Add")
    fireEvent.press(fab())
    expect(fab().props.accessibilityLabel).toBe("Dismiss")
  })

  it("reports the disabled a11y state when disabled", () => {
    renderWithProviders(<SpeedDial actions={threeActions} disabled />)
    expect(fab().props.accessibilityState.disabled).toBe(true)
  })

  it("each action is a labeled button", () => {
    renderWithProviders(<SpeedDial actions={threeActions} defaultOpen />)
    const action = screen.getByTestId("speed-dial-action-income")
    expect(action.props.accessibilityRole).toBe("button")
    expect(action.props.accessibilityLabel).toBe("Income")
  })

  it("an action falls back to id for its label when none is given", () => {
    renderWithProviders(
      <SpeedDial defaultOpen actions={[{ id: "create", icon: icon("c"), onPress: jest.fn() }]} />,
    )
    expect(screen.getByTestId("speed-dial-action-create").props.accessibilityLabel).toBe("create")
  })

  it("a disabled action reports the disabled a11y state", () => {
    renderWithProviders(
      <SpeedDial
        defaultOpen
        actions={[{ id: "x", icon: icon("x"), disabled: true, onPress: jest.fn() }]}
      />,
    )
    expect(screen.getByTestId("speed-dial-action-x").props.accessibilityState.disabled).toBe(true)
  })
})

// --- Rendering ----------------------------------------------------------------

describe("SpeedDial · rendering", () => {
  it("renders with zero actions (FAB only)", () => {
    renderWithProviders(<SpeedDial actions={[]} />)
    expect(fab()).toBeTruthy()
    expect(screen.queryByTestId("speed-dial-action-anything")).toBeNull()
  })

  it("renders a single action", () => {
    renderWithProviders(
      <SpeedDial defaultOpen actions={[{ id: "solo", icon: icon("s"), onPress: jest.fn() }]} />,
    )
    expect(screen.getByTestId("speed-dial-action-solo")).toBeTruthy()
  })

  it("renders every action testID for multiple actions", () => {
    renderWithProviders(<SpeedDial defaultOpen actions={threeActions} />)
    for (const id of ["expense", "income", "transfer"]) {
      expect(screen.getByTestId(`speed-dial-action-${id}`)).toBeTruthy()
    }
  })

  it("renders action labels", () => {
    renderWithProviders(<SpeedDial defaultOpen actions={threeActions} />)
    expect(screen.getByText("Expense")).toBeTruthy()
    expect(screen.getByText("Income")).toBeTruthy()
    expect(screen.getByText("Transfer")).toBeTruthy()
  })

  it("renders custom icons", () => {
    renderWithProviders(<SpeedDial defaultOpen actions={threeActions} />)
    expect(screen.getByText("minus")).toBeTruthy()
  })

  it("renders a custom FAB icon and close icon", () => {
    renderWithProviders(
      <SpeedDial
        actions={[]}
        icon={<Text>plus-glyph</Text>}
        closeIcon={<Text>x-glyph</Text>}
      />,
    )
    expect(screen.getByText("plus-glyph")).toBeTruthy()
    expect(screen.getByText("x-glyph")).toBeTruthy()
  })

  it("does not render the backdrop when backdrop={false}", () => {
    renderWithProviders(<SpeedDial actions={threeActions} backdrop={false} />)
    expect(screen.queryByTestId("speed-dial-backdrop")).toBeNull()
  })

  it("derives testIDs from a custom base testID", () => {
    renderWithProviders(
      <SpeedDial
        testID="fab-menu"
        defaultOpen
        actions={[{ id: "a", icon: icon("a"), onPress: jest.fn() }]}
      />,
    )
    expect(screen.getByTestId("fab-menu-fab")).toBeTruthy()
    expect(screen.getByTestId("fab-menu-backdrop")).toBeTruthy()
    expect(screen.getByTestId("fab-menu-action-a")).toBeTruthy()
  })
})
