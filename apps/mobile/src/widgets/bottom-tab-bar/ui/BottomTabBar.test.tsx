import { describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render, screen } from "@testing-library/react-native"
import { StyleSheet, Text } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { colors as colorsRN } from "@expense-tracker/tokens/react-native"
import { ThemeProvider } from "@/shared/config/theme"
import { SpeedDial, type SpeedDialAction } from "@/shared/ui"
import { BottomTabBar, type TabConfig } from "./BottomTabBar"
import { TabBarHeightProvider, useTabBarHeight } from "./tab-bar-height-context"

// --- Mock the headless expo-router tab hook -----------------------------------

/**
 * `useTabTrigger` is expo-router's framework hook (reads the navigator + trigger
 * map contexts). For this unit test of the bar's *rendering* we stub it to
 * control `isFocused` per name and capture press handlers. Real navigation
 * (press -> route switch) is covered by the Maestro e2e (02-tab-navigation),
 * which is the right place for it - expo-router's route resolution does not run
 * under jest.
 */
jest.mock("expo-router/ui", () => ({
  useTabTrigger: jest.fn(),
}))

interface TriggerProps {
  isFocused: boolean
  onPress: jest.Mock
  onLongPress: jest.Mock
}

const useTabTriggerMock = (jest.requireMock("expo-router/ui") as {
  useTabTrigger: jest.Mock
}).useTabTrigger as unknown as jest.Mock<
  (options: { name: string }) => { triggerProps: TriggerProps }
>

// --- Fixtures & helpers -------------------------------------------------------

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }
// Default resolved theme under jest is "light" (useColorScheme() -> null).
const ACTIVE = colorsRN.light.primary
const INACTIVE = colorsRN.light["muted-foreground"]

const TABS: readonly TabConfig[] = [
  { name: "index", label: "Dashboard", testId: "tab-dashboard", icon: "grid-outline" },
  { name: "transactions", label: "Transactions", testId: "tab-transactions", icon: "swap-horizontal-outline" },
  { name: "accounts", label: "Accounts", testId: "tab-accounts", icon: "wallet-outline" },
  { name: "settings", label: "Settings", testId: "tab-settings", icon: "settings-outline" },
]

/**
 * Drives the mocked `useTabTrigger`: returns `isFocused` based on `focusedName`
 * and stable per-name press spies. Returns the spies so a test can assert the
 * bar wired the framework handler through to the Pressable.
 */
function focusOn(focusedName: string) {
  const onPress: Record<string, jest.Mock> = {}
  const onLongPress: Record<string, jest.Mock> = {}
  useTabTriggerMock.mockImplementation(({ name }: { name: string }) => {
    onPress[name] ??= jest.fn()
    onLongPress[name] ??= jest.fn()
    return {
      triggerProps: {
        isFocused: name === focusedName,
        onPress: onPress[name],
        onLongPress: onLongPress[name],
      },
    }
  })
  return { onPress, onLongPress }
}

function renderBar() {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <TabBarHeightProvider>
          <BottomTabBar tabs={TABS} />
        </TabBarHeightProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

/** Color applied to a tab's label Text (the focused/unfocused tint). */
const labelColor = (label: string) =>
  StyleSheet.flatten(screen.getByText(label).props.style).color

/** Walks up from the FAB slot to the root View that carries `onLayout`. */
const rootView = () => {
  let node = screen.getByTestId("tab-bar-fab-slot").parent
  while (node) {
    if (typeof node.props.onLayout === "function") return node
    node = node.parent
  }
  throw new Error("root view with onLayout not found")
}

// --- BottomTabBar -------------------------------------------------------------

describe("BottomTabBar · tabs", () => {
  it("renders all four tab testIDs", () => {
    focusOn("index")
    renderBar()
    for (const id of ["tab-dashboard", "tab-transactions", "tab-accounts", "tab-settings"]) {
      expect(screen.getByTestId(id)).toBeTruthy()
    }
  })

  it("reserves a central slot for the FAB between the tab groups", () => {
    focusOn("index")
    renderBar()
    expect(screen.getByTestId("tab-bar-fab-slot")).toBeTruthy()
  })

  it("tints the focused tab with the active token and the rest with inactive", () => {
    focusOn("transactions") // Transactions focused
    renderBar()
    expect(labelColor("Transactions")).toBe(ACTIVE)
    for (const label of ["Dashboard", "Accounts", "Settings"]) {
      expect(labelColor(label)).toBe(INACTIVE)
    }
  })

  it("labels each tab and marks the focused one selected for accessibility", () => {
    focusOn("index")
    renderBar()
    const dashboard = screen.getByTestId("tab-dashboard")
    expect(dashboard.props.accessibilityRole).toBe("tab")
    expect(dashboard.props.accessibilityState).toEqual({ selected: true })
    expect(dashboard.props.accessibilityLabel).toBe("Dashboard, tab, 1 of 4")
    expect(screen.getByTestId("tab-settings").props.accessibilityState).toEqual({
      selected: false,
    })
  })
})

describe("BottomTabBar · navigation wiring", () => {
  it("delegates a tab tap to the useTabTrigger onPress handler", () => {
    const { onPress } = focusOn("index")
    renderBar()
    fireEvent.press(screen.getByTestId("tab-transactions"))
    expect(onPress.transactions).toHaveBeenCalledTimes(1)
  })

  it("does not fire another tab's handler when a different tab is tapped", () => {
    const { onPress } = focusOn("index")
    renderBar()
    fireEvent.press(screen.getByTestId("tab-accounts"))
    expect(onPress.accounts).toHaveBeenCalledTimes(1)
    expect(onPress.index).not.toHaveBeenCalled()
    expect(onPress.settings).not.toHaveBeenCalled()
  })

  it("wires the long-press handler through", () => {
    const { onLongPress } = focusOn("index")
    renderBar()
    fireEvent(screen.getByTestId("tab-settings"), "longPress")
    expect(onLongPress.settings).toHaveBeenCalledTimes(1)
  })
})

describe("BottomTabBar · height reporting", () => {
  it("reports its measured height so the overlay can position the FAB", () => {
    focusOn("index")
    function HeightReader() {
      const h = useTabBarHeight()
      return <Text testID="height-reader">{h}</Text>
    }
    render(
      <SafeAreaProvider
        initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
      >
        <ThemeProvider>
          <TabBarHeightProvider>
            <BottomTabBar tabs={TABS} />
            <HeightReader />
          </TabBarHeightProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    )
    expect(screen.getByTestId("height-reader").props.children).toBe(0)
    fireEvent(rootView(), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height: 83 } },
    })
    expect(screen.getByTestId("height-reader").props.children).toBe(83)
  })
})

// --- SpeedDial + tab-bar integration -------------------------------

function renderIntegration({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  const onExpense = jest.fn()
  const onIncome = jest.fn()
  const onTransfer = jest.fn()
  const actions: SpeedDialAction[] = [
    { id: "expense", label: "Expense", icon: <Text>e</Text>, onPress: onExpense },
    { id: "income", label: "Income", icon: <Text>i</Text>, onPress: onIncome },
    { id: "transfer", label: "Transfer", icon: <Text>t</Text>, onPress: onTransfer },
  ]
  const handlers = focusOn("index")
  const utils = render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <TabBarHeightProvider>
          <BottomTabBar tabs={TABS} />
          <SpeedDial
            position="center"
            bottomOffset={55}
            defaultOpen={defaultOpen}
            actions={actions}
            label="Add transaction"
            closeLabel="Close transaction actions"
          />
        </TabBarHeightProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
  const fab = () => screen.getByTestId("speed-dial-fab")
  const fabExpanded = () => Boolean(fab().props.accessibilityState?.expanded)
  return { ...utils, handlers, fab, fabExpanded, onExpense, onIncome, onTransfer }
}

describe("SpeedDial + BottomTabBar integration", () => {
  it("closed: FAB is visible, actions and backdrop hidden", () => {
    const { fab, fabExpanded } = renderIntegration()
    expect(fab()).toBeTruthy()
    expect(fabExpanded()).toBe(false)
    // Actions and the scrim are hidden (and non-interactive) while closed.
    expect(screen.queryByTestId("speed-dial-action-expense")).toBeNull()
    expect(screen.queryByTestId("speed-dial-backdrop")).toBeNull()
  })

  it("open: pressing the FAB expands the menu (actions become interactive)", () => {
    const { fab, fabExpanded, onExpense } = renderIntegration()
    fireEvent.press(fab())
    expect(fabExpanded()).toBe(true)
    fireEvent.press(screen.getByTestId("speed-dial-action-expense"))
    expect(onExpense).toHaveBeenCalledTimes(1)
  })

  it("pressing an action closes the menu", () => {
    const { fab, fabExpanded } = renderIntegration()
    fireEvent.press(fab())
    fireEvent.press(screen.getByTestId("speed-dial-action-income"))
    expect(fabExpanded()).toBe(false)
  })

  it("pressing the backdrop closes the menu", () => {
    const { fab, fabExpanded } = renderIntegration({ defaultOpen: true })
    fireEvent.press(screen.getByTestId("speed-dial-backdrop"))
    expect(fabExpanded()).toBe(false)
  })

  it("tapping a tab still fires its press handler while the SpeedDial is present (closed)", () => {
    const { handlers, fabExpanded } = renderIntegration()
    fireEvent.press(screen.getByTestId("tab-transactions"))
    expect(handlers.onPress.transactions).toHaveBeenCalledTimes(1)
    // Opening/closing the SpeedDial never changes the active tab.
    expect(fabExpanded()).toBe(false)
  })

  it("the SpeedDial FAB is not exposed to accessibility as a tab", () => {
    const { fab } = renderIntegration()
    expect(fab().props.accessibilityRole).toBe("button")
    expect(fab().props.accessibilityLabel).toBe("Add transaction")
  })
})
