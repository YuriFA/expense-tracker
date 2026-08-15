# SpeedDial (expandable FAB)

Purpose-built expandable floating action button for the app's single use case:
the centered `+` straddling the bottom tab bar (`src/app/(tabs)/_layout.tsx`).
Tap the FAB to expand a horizontal row of action buttons over a dimmed
backdrop; tap the FAB again, the backdrop, or any action to collapse it. Built
only from low-level primitives (`react-native-reanimated`,
`react-native-safe-area-context`, RN `Pressable`/`View`, Uniwind) - no FAB menu
library.

The API is deliberately narrow (uncontrolled, centered, fixed testIDs). If a
second, different FAB use case ever appears, generalize then - not before.

This component knows nothing about transactions/accounts/categories. It renders
whatever `actions` it is given; navigation/submit handlers live in the layout.

## API

```tsx
<SpeedDial
  actions={[
    { id: 'expense', label: 'Expense', icon: <Icon name="remove" />, onPress: handleExpense },
    { id: 'income', label: 'Income', icon: <Icon name="add" />, onPress: handleIncome },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: <Icon name="swap-horizontal" />,
      onPress: handleTransfer,
    },
  ]}
  label="Add transaction"
  closeLabel="Close transaction actions"
  bottomOffset={tabBarHeight - FAB_SIZE / 2}
/>
```

- `actions` - `SpeedDialActionItem[]`: `id`, `icon`, `onPress`, plus optional
  `label` / `accessibilityLabel` (a11y fallback chain: `accessibilityLabel` →
  `label` → `id`) and `size` (icon circle diameter, default 48).
- `label` / `closeLabel` - FAB accessibility label when closed / open.
- `bottomOffset` - distance from the viewport's bottom edge to the FAB's bottom
  edge. Default: safe-area bottom inset + edge margin. Over a tab bar pass
  `tabBarHeight - FAB_SIZE/2` (the layout does); the component never hardcodes
  the tab-bar height.

Open/close state is internal (uncontrolled): FAB toggles, backdrop tap and any
action press collapse the menu (an action's `onPress` runs after closing).

## Mounting, layering, animation

One self-contained absolute overlay (`pointerEvents="box-none"` so empty areas
pass touches through), mounted as a **sibling** of the screen's scrollable
content / tab navigator - never inside a `ScrollView`. Stack: backdrop
(animated-opacity scrim, tappable only when open), action row, FAB.

All open/close motion is driven by **one Reanimated `SharedValue<number>`
`progress`** (0 = closed, 1 = open): the FAB `+` rotates 0→45deg into an `x`,
actions stagger in via `interpolate(progress, [i*STAGGER, i*STAGGER+SEGMENT], [0,1])`,
the scrim fades via `interpolate(progress, [0,1], [0, DEFAULT_BACKDROP_OPACITY])`.
No JS timers anywhere; rapid toggling just re-targets `progress`, so it can
never leave an action hung or the FAB mid-rotation. The React `open` state only
gates `pointerEvents`/accessibility, never the visuals.

## testID contract

Fixed base `speed-dial` (Maestro relies on these exact ids):

- `speed-dial` - the overlay root
- `speed-dial-fab` - the main FAB button
- `speed-dial-backdrop` - the scrim
- `speed-dial-action-{action.id}` - each action
