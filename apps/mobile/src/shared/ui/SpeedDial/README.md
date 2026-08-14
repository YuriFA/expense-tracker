# SpeedDial (Expandable FAB)

A generic, domain-free expandable floating action button. Tap the main FAB to
expand a vertical stack of action buttons over a dimmed backdrop; tap the FAB
again, the backdrop, or any action to collapse it. Built only from low-level
primitives (`react-native-reanimated`, `react-native-safe-area-context`, RN
`Pressable`/`View`, NativeWind) - no Paper/Base/etc. FAB menu library.

This component knows nothing about transactions/accounts/categories. It renders
whatever `actions` it is given.

## Architecture decision

### Where it lives

`src/shared/ui/SpeedDial/`, mirroring the existing `shared/ui` convention exactly
(one PascalCase component file per concern, a `*.types.ts`, a `constants.ts`, and
an `index.ts` barrel). Styling is NativeWind `className` consuming the design
tokens (no `.styles.ts` - matches `Button`, `Card`, `IconButton`). Exported
through the `src/shared/ui/index.ts` barrel.

Files: `SpeedDial.tsx` (state + layering + FAB), `SpeedDialAction.tsx` (one action
row: label pill + icon circle), `SpeedDial.types.ts`, `constants.ts`, `index.ts`.

### Overlay / backdrop and layering (z-index / stacking)

SpeedDial renders **one self-contained absolute overlay** and must be mounted as
a **sibling of the screen's scrollable content** (never *inside* a `ScrollView` /
`FlatList` / `FlashList`, otherwise it would scroll with the list). The overlay is
`position: 'absolute'`, top/left/right/bottom = 0, and uses
`pointerEvents="box-none"` so empty areas pass touches through to the content
underneath - only the FAB, the actions, and the open backdrop intercept.

Stacking order inside the overlay (paint order = last on top, reinforced with
`zIndex`/`elevation`):

1. **Backdrop** (`bg-black`, animated opacity) - lowest. `pointerEvents` gated by
   the open state, so when closed it is invisible and lets all touches through.
2. **Actions column** - anchored above the FAB, growing upward.
3. **FAB** - always interactive, topmost.

No `Modal`/portal/BottomSheet is used - this keeps SpeedDial part of the
current screen UI. Because the overlay is absolute within
wherever it is mounted, it correctly floats above sibling cards/headers/list
content; the mounting point (a screen, or - in the later tab-bar task - the tab
layout) determines its scope.

### Safe area and the bottom tab bar (no hardcoded tab-bar height)

`react-native-safe-area-context`'s `useSafeAreaInsets()` is read inside the
component. The FAB's vertical position is `bottomOffset` (default =
`insets.bottom` + a small edge margin, so it clears the iOS home indicator on its
own) and its horizontal position is `horizontalOffset` (default =
`insets[left|right]` + the margin). The component **never hardcodes a tab-bar
height**. When a consumer mounts SpeedDial over a bottom tab bar it passes
`bottomOffset = tabBarHeight + safeAreaInsetBottom` (the tab-bar integration task
supplies that). This keeps SpeedDial generic and the tab bar decoupled.

### Why this animation approach (single shared value = single source of truth)

All open/close motion is driven by **one Reanimated `SharedValue<number>`
`progress`** (0 = fully closed, 1 = fully open). When the open state flips, an
effect simply re-targets `progress.value = withTiming(open ? 1 : 0, config)` -
there are **no JS timers / `setTimeout`** anywhere, and no `Animated`/
`LayoutAnimation`.

- **FAB `+ -> x`**: the default `add` glyph is rotated 0 -> 45deg from `progress`
  (a `+` rotated 45deg is an `x`). When both a custom `icon` and `closeIcon` are
  provided, the two layers cross-fade instead.
- **Staggered actions**: each action's opacity / translateY / scale is derived
  from the *same* `progress` via `interpolate(progress, [i*STAGGER, i*STAGGER+SEGMENT], [0,1], CLAMP)`.
  This produces a per-index delay on expand and a coherent reverse on collapse -
  purely from one shared value, no per-action timers.
- **Backdrop**: `interpolate(progress, [0,1], [0, backdropOpacity], CLAMP)`.

**Race safety:** because `progress` is the single source and
Reanimated cancels and re-targets an in-flight animation when you assign a new
target, rapid `open/close/open` simply re-targets `progress` - it cannot leave an
action hung, the FAB mid-rotation, or a stuck backdrop. The React `open` state
only gates mounting/`pointerEvents`/accessibility; the *visual* state is always
the shared value, never React state + timers.

**Reduced motion:** `useReducedMotion()` shortens the timing
and drops the translate/scale so only a quick opacity transition plays. The
architecture lets motion be disabled without restructuring.

## API

```tsx
// Uncontrolled (primary API - actions array)
<SpeedDial
  actions={[
    { id: 'expense', label: 'Expense', icon: <Icon name="remove" />, onPress: handleExpense },
    { id: 'income', label: 'Income', icon: <Icon name="add" />, onPress: handleIncome },
    { id: 'transfer', label: 'Transfer', icon: <Icon name="swap-horizontal" />, onPress: handleTransfer },
  ]}
/>

// Controlled
<SpeedDial open={open} onOpenChange={setOpen} actions={actions} />
```

See `SpeedDial.types.ts` for the full prop list. Mount it as a sibling of your
scrollable content; pass `bottomOffset` when sitting over a tab bar.

## testID contract

Derived from the `testID` prop (default `speed-dial`) and action `id`s. E2e
(Maestro, later task) relies on these exact ids:

- `{testID}` - FAB (alias)
- `{testID}-fab` - the main FAB button
- `{testID}-backdrop` - the scrim
- `{testID}-action-{action.id}` - each action
