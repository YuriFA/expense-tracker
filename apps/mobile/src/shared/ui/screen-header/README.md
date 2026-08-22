# ScreenHeader (collapsible large title)

Reusable header for stack (non-tab) destinations - the iOS large-title
pattern implemented as pure in-screen UI, cross-platform, with no
iOS-only native API. Native navigation headers stay hidden for these
screens (`headerShown: false` is already the root Stack default).

Purpose-built for pushed screens like `income`, `accounts`, `goals`. Tab
roots keep their existing in-screen titles (no back affordance, no
collapse); `(auth)` keeps its native headers. If a second header concept
ever appears, generalize then - not before.

The component knows nothing about domain entities, repositories or app
state: it renders the given `title` / `right` slot and animates from the
scroll offset.

## Usage

```tsx
<Screen testID="screen-accounts" topInset={false}>
  <ScreenHeader
    title="Счета"
    right={<AddButton />} // optional trailing bar action
    onBack={handleCustomBack} // optional; defaults to router.back()
  />
  <ScreenScrollView>
    <View className="p-6 gap-6">…</View>
  </ScreenScrollView>
  {/* sheets etc. stay siblings too */}
</Screen>
```

`ScreenHeader` is a pure overlay: it takes no layout space and renders the
compact bar + large title absolutely over the screen, as a sibling of the
scroll body. `topInset={false}` on `Screen` is required: the header owns
the top safe-area inset (it pads the compact bar and the large title
itself), and the scroll body must start at y = 0 so the content can slide
under the header.

## Scroll wiring

`Screen` hosts the `ScreenHeaderScrollProvider` (this slice), which owns
the scroll shared value, the collapse-threshold state and the header
content metrics - that's what lets the header and the scroll container
compose as plain siblings. `ScreenScrollView` consumes the context,
attaches the scroll handler and applies the content padding. The header
therefore works independently of what the screen scrolls - when a screen
needs a `FlatList`/`SectionList`, add a `ScreenFlatList`/`ScreenSectionList`
wrapper in this slice consuming the same `useScreenHeaderScroll()`
context (ListHeaderComponent/`contentContainerStyle` merge as in
`screen-scroll-view.tsx`); don't duplicate header logic. Until a real
consumer exists, only `ScreenScrollView` is exported (unused exports fail
`pnpm knip`).

Limitations (deliberate):

- the header owns `onScroll` - no custom scroll callbacks today;
- exactly one Screen\* scroll container per ScreenHeader;
- metrics (`COMPACT_BAR_HEIGHT`, `LARGE_TITLE_ZONE`, …) are component
  constants (`constants.ts`), not design tokens (SpeedDial precedent).

## Animation model

One SharedValue - the raw `scrollY` - drives everything on the UI thread
(SpeedDial's "single source of animation truth" pattern); no React state
per scroll event. `progress = clamp(scrollY / LARGE_TITLE_ZONE, 0, 1)`
and every layer interpolates from it:

- large title: `translateY = -clamp(scrollY, 0, LARGE_TITLE_ZONE)` - it
  moves 1:1 with the content, so it feels pinned to the finger - plus an
  opacity fade over most of the range;
- compact title: fades in (with a small settle) over the last half;
- bar background: a frosted layer (expo-blur `BlurView` at a subtle
  intensity + a light `bg-white/30` wash + hairline `border-b`) that fades
  in over the last stretch - content sliding under the bar stays visible,
  softened and whitened like the iOS nav bar (dithered blur on Android).

The only React state is a `collapsed` boolean flipped once per threshold
crossing (via `runOnJS` from the scroll handler worklet); it gates
accessibility between the two title nodes so screen readers never
announce both.

## testID contract

Fixed ids (Maestro relies on exact ids, SpeedDial-style):

- `screen-header` - the compact bar
- `screen-header-back` - the back button
- `screen-header-compact-title` - the bar title node
- `screen-header-large-title` - the large title node
