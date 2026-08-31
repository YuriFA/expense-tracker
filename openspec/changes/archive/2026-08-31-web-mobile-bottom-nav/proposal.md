# Proposal: web-mobile-bottom-nav

## Why

Below 1024px the web app's only navigation is a hamburger drawer that clones the
desktop sidebar (7 entries + auth footer). On phone widths this hides navigation
behind two taps, buries the primary "add transaction" action inside a menu, and
diverges from the RN app's thumb-first bottom-tab pattern. An approved design
exists (superdesign draft `99e2a910-ec8e-4ac6-97a9-4aab96545efb` v5, variant A
"floating pill", project `e8178e09-b9a9-48f6-af10-99060c3efede`) and defines the
target shell, so the contract can be pinned down now.

## What Changes

- On viewports below 768px, navigation moves from the hamburger drawer to a
  bottom tab bar with 4 primary tabs — Главная (`/`), Планы (`/plans`),
  Аналитика (`/analytics`), Настройки (`/settings`) — split 2 left / 2 right
  around a central gap slot; a floating circular FAB straddles the bar's top
  edge in the slot.
- The FAB opens a speed-dial with three labeled actions (расход, перевод,
  доход) that open the existing add-transaction forms/dialogs — the same
  interaction pattern as the RN tab bar's speed-dial.
- The hamburger drawer is removed below 768px entirely; the desktop sidebar is
  shown from 768px (the `isDesktop` media query moves from 1024px to 768px).
- A slim sticky top bar replaces the old mobile top bar: brand logomark +
  «Кошелёк» on the left; sync status badge + avatar menu (user email, sign out)
  on the right. For anonymous users the right side shows the guest-mode badge
  and a «Войти» button instead of the avatar menu.
- Transactions, debts, and accounts stay reachable on phone widths through the
  dashboard cards (existing links on the dashboard screen).
- The shell becomes safe-area aware for PWA standalone mode
  (`viewport-fit=cover`, `env(safe-area-inset-bottom)` under the tab bar and FAB).
- Presentation-only change: no API/OpenAPI, data, or sync behavior changes.
  Visual style follows Direction D tokens; radii: tab bar container 24px,
  active tab pill 20px, FAB circular.

## Capabilities

### New Capabilities

(none — the mobile shell is part of the existing screen inventory and
navigation contract)

### Modified Capabilities

- `web-screens`: the navigation contract becomes viewport-aware — below 768px
  persistent navigation is the bottom tab bar + FAB + top bar shell (new
  requirements), the screen-inventory requirement keeps the full screen set
  reachable (primary tabs + dashboard links), and account access (sign in /
  sign out / user email / guest badge) moves into the top bar.

## Impact

- `apps/web/src/app/layout/` — `AppShell.vue` (breakpoint 1024→768),
  `MobileTopBar.vue` (removed or repurposed), new shell widgets: bottom tab
  bar, FAB speed-dial, avatar menu (FSD placement decided in design.md).
- `apps/web/src/features/transaction/add` — reused as-is by the speed-dial.
- `apps/web/e2e/` — specs that navigate via the drawer and match
  sync/guest-badge testids below the desktop breakpoint (badges stay
  single-instance per viewport).
- `apps/web/index.html` — `viewport-fit=cover`; `packages/i18n` locales — new
  shell keys (ru/en).
- No backend, OpenAPI, or package-boundary changes.
