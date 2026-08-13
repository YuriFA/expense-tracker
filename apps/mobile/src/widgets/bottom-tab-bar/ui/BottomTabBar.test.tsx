import { describe, expect, it, jest } from "@jest/globals"
import type { ReactNode } from "react"
import { fireEvent, render, screen } from "@testing-library/react-native"
import { Text } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import type { BottomTabBarProps } from "expo-router/js-tabs"
import { ThemeProvider } from "@/shared/config/theme"
import { SpeedDial, type SpeedDialAction } from "@/shared/ui"
import { BottomTabBar } from "./BottomTabBar"
import { TabBarHeightProvider, useTabBarHeight } from "./tab-bar-height-context"

// --- Fixtures & helpers -------------------------------------------------------

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }
const ACTIVE = "#ff0000"
const INACTIVE = "#999999"

type TabBarIconFn = jest.Mock<(args: { focused: boolean; color: string; size: number }) => ReactNode>

const TAB_DEFS = [
  { key: "index", name: "index", title: "Dashboard", testId: "tab-dashboard" },
  { key: "transactions", name: "transactions", title: "Transactions", testId: "tab-transactions" },
  { key: "accounts", name: "accounts", title: "Accounts", testId: "tab-accounts" },
  { key: "settings", name: "settings", title: "Settings", testId: "tab-settings" },
] as const

interface FakeProps extends Omit<BottomTabBarProps, "state" | "descriptors" | "navigation"> {
  state: { index: number; routes: { key: string; name: string; params?: unknown }[] }
  descriptors: Record<
    string,
    {
      options: {
        title: string
        tabBarButtonTestID: string
        tabBarIcon: TabBarIconFn
        tabBarActiveTintColor?: string
        tabBarInactiveTintColor?: string
      }
    }
  >
  navigation: { emit: jest.Mock; navigate: jest.Mock }
  iconFns: TabBarIconFn[]
}

/** Builds BottomTabBarProps for 4 tabs, plus per-tab icon spies (to assert color). */
function makeProps(focusedIndex = 0): FakeProps {
  const iconFns = TAB_DEFS.map(
    (d) =>
      jest.fn(
        ({ color }: { focused: boolean; color: string; size: number }) => (
          <Text>{`${d.testId}:${color}`}</Text>
        ),
      ) as TabBarIconFn,
  )
  const descriptors = {} as FakeProps["descriptors"]
  TAB_DEFS.forEach((d, i) => {
    descriptors[d.key] = {
      options: {
        title: d.title,
        tabBarButtonTestID: d.testId,
        tabBarIcon: iconFns[i],
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
      },
    }
  })
  return {
    state: {
      index: focusedIndex,
      routes: TAB_DEFS.map((d) => ({ key: d.key, name: d.name, params: undefined })),
    },
    descriptors,
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    insets: ZERO_INSETS,
    iconFns,
  }
}

function renderBar(props: FakeProps) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <TabBarHeightProvider>
          <BottomTabBar {...(props as unknown as BottomTabBarProps)} />
        </TabBarHeightProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  )
}

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
    renderBar(makeProps())
    for (const id of ["tab-dashboard", "tab-transactions", "tab-accounts", "tab-settings"]) {
      expect(screen.getByTestId(id)).toBeTruthy()
    }
  })

  it("reserves a central slot for the FAB between the tab groups", () => {
    renderBar(makeProps())
    expect(screen.getByTestId("tab-bar-fab-slot")).toBeTruthy()
  })

  it("passes the active tint to the focused tab's icon and inactive to the rest", () => {
    const props = makeProps(1) // Transactions focused
    renderBar(props)
    expect(props.iconFns[1]).toHaveBeenCalledWith(
      expect.objectContaining({ focused: true, color: ACTIVE, size: 24 }),
    )
    for (const i of [0, 2, 3]) {
      expect(props.iconFns[i]).toHaveBeenCalledWith(
        expect.objectContaining({ focused: false, color: INACTIVE }),
      )
    }
  })

  it("labels each tab and marks the focused one selected for accessibility", () => {
    renderBar(makeProps(0))
    const dashboard = screen.getByTestId("tab-dashboard")
    expect(dashboard.props.accessibilityRole).toBe("tab")
    expect(dashboard.props.accessibilityState).toEqual({ selected: true })
    expect(dashboard.props.accessibilityLabel).toBe("Dashboard, tab, 1 of 4")
    expect(screen.getByTestId("tab-settings").props.accessibilityState).toEqual({
      selected: false,
    })
  })
})

describe("BottomTabBar · navigation", () => {
  it("emits tabPress and navigates when an inactive tab is tapped", () => {
    const props = makeProps(0)
    renderBar(props)
    fireEvent.press(screen.getByTestId("tab-transactions"))
    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tabPress", target: "transactions", canPreventDefault: true }),
    )
    expect(props.navigation.navigate).toHaveBeenCalledWith("transactions", undefined)
  })

  it("does not navigate when the already-focused tab is tapped", () => {
    const props = makeProps(0)
    renderBar(props)
    fireEvent.press(screen.getByTestId("tab-dashboard"))
    expect(props.navigation.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tabPress", target: "index" }),
    )
    expect(props.navigation.navigate).not.toHaveBeenCalled()
  })

  it("respects a prevented tabPress (does not navigate)", () => {
    const props = makeProps(0)
    props.navigation.emit = jest.fn(() => ({ defaultPrevented: true }))
    renderBar(props)
    fireEvent.press(screen.getByTestId("tab-accounts"))
    expect(props.navigation.navigate).not.toHaveBeenCalled()
  })
})

describe("BottomTabBar · height reporting", () => {
  it("reports its measured height so the overlay can position the FAB", () => {
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
            <BottomTabBar {...(makeProps() as unknown as BottomTabBarProps)} />
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

// --- SpeedDial + tab-bar integration (spec section 31) ------------------------

function renderIntegration({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  const onExpense = jest.fn()
  const onIncome = jest.fn()
  const onTransfer = jest.fn()
  const actions: SpeedDialAction[] = [
    { id: "expense", label: "Expense", icon: <Text>e</Text>, onPress: onExpense },
    { id: "income", label: "Income", icon: <Text>i</Text>, onPress: onIncome },
    { id: "transfer", label: "Transfer", icon: <Text>t</Text>, onPress: onTransfer },
  ]
  const props = makeProps(0)
  const utils = render(
    <SafeAreaProvider
      initialMetrics={{ insets: ZERO_INSETS, frame: { x: 0, y: 0, width: 375, height: 812 } }}
    >
      <ThemeProvider>
        <TabBarHeightProvider>
          <BottomTabBar {...(props as unknown as BottomTabBarProps)} />
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
  return { ...utils, props, fab, fabExpanded, onExpense, onIncome, onTransfer }
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

  it("tapping a tab still navigates while the SpeedDial is present (closed)", () => {
    const { props, fabExpanded } = renderIntegration()
    fireEvent.press(screen.getByTestId("tab-transactions"))
    expect(props.navigation.navigate).toHaveBeenCalledWith("transactions", undefined)
    // Opening/closing the SpeedDial never changes the active tab.
    expect(fabExpanded()).toBe(false)
  })

  it("the SpeedDial FAB is not exposed to accessibility as a tab", () => {
    const { fab } = renderIntegration()
    expect(fab().props.accessibilityRole).toBe("button")
    expect(fab().props.accessibilityLabel).toBe("Add transaction")
  })
})
