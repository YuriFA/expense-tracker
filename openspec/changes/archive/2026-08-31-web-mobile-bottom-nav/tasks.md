# Tasks: web-mobile-bottom-nav

## 1. Shell plumbing

- [x] 1.1 In `apps/web/index.html` add `viewport-fit=cover` to the viewport meta
- [x] 1.2 In `AppShell.vue` switch the navigation gate to `useMediaQuery('(min-width: 768px)')` and keep the JS-gated single-instance invariant for sync/guest badges
- [x] 1.3 Swap `lg:` classes for `md:` on the desktop/mobile chrome split (`AppSidebar` `hidden md:flex`, mobile shell `md:hidden`); remove the hamburger `Sheet` wiring from the old mobile top bar path

## 2. Mobile shell widget

- [x] 2.1 Create `widgets/mobile-shell/` with public API (`index.ts`): `MobileTopBar`, `BottomTabBar`, `SpeedDialFab`, `UserMenu`, and a `BottomNavLayout` wrapper that owns tab-bar + FAB positioning and `env(safe-area-inset-bottom)` padding
- [x] 2.2 Rework `MobileTopBar.vue`: brand logomark + «Кошелёк» left; right side `SyncStatusBadge` (existing testid) + account area — `UserMenu` (avatar dropdown: email + «Выйти», reusing the session sign-out flow) for signed-in, guest badge + «Войти» `RouterLink` to `/login` for anonymous
- [x] 2.3 Implement `BottomTabBar.vue`: 4 `RouterLink` tabs (Главная, Планы, Аналитика, Настройки) split 2/2 around the central slot, floating pill per approved mockup (bg card, 24px container radius, 20px active-tab pill radius, elevation shadow), active state via the shared `route.name.startsWith` helper extracted from `AppSidebarNav`
- [x] 2.4 Implement `SpeedDialFab.vue`: 56px circular teal FAB straddling the bar's top edge; on open — scrim plus three labeled actions (расход / перевод / доход) with destructive / neutral-tint / success styling; three single-instance dialogs embedding `CashflowForm` / `TransferForm` per the QuickActionsCard pattern; keep/renumber existing add-operation testids consistently and update e2e references

## 3. i18n

- [x] 3.1 Add shell keys (avatar menu, speed-dial labels, a11y labels) to `packages/i18n` locales `ru.json` and `en.json`; reuse existing `nav.*` keys for tabs
- [x] 3.2 Run `pnpm i18n:lint` and fix any gaps

## 4. Visual fidelity + regression

- [x] 4.1 Verify the shell against the approved mockup (draft `99e2a910…` v5): radii 24/20px, FAB 56px straddling the bar, shadow values, safe-area padding in standalone mode
- [x] 4.2 Check tablet range 768–1023: desktop sidebar + `max-w-6xl` content fit without overflow
- [x] 4.3 Confirm screens transactions/debts/accounts remain reachable from the dashboard cards at phone widths (links intact)

## 5. Tests

- [x] 5.1 Update e2e specs that used the drawer below 1024px to the new shell selectors; add coverage for the spec scenarios: tab navigation/active state, FAB speed-dial opens the three flows without navigating, avatar menu sign-out, guest «Войти» → login, single-instance badges
- [x] 5.2 Run workspace checks: `pnpm arch:check`, `pnpm knip`, web type-check/lint/unit, and the e2e suite; fix findings

## 6. Canvas round-2 restyle (approved on canvas 2026-08-31)

- [x] 6.1 Tab bar: full width with 16px edge margins (`self-stretch`), 70px tabs, central slot 56px, FAB overlap lowered to 20px (`-mb-5`)
- [x] 6.2 Speed-dial: horizontal row above the FAB (56/80/56) with pastel tint tiles (`primary`/`warning`/`success` at 10%) and saturated glyphs, short labels under the circles (new `shell.transfer/expense/income` keys), white 70% scrim instead of dark; fix non-generated `size-13/size-18` classes (explicit `size-14`/`size-20`)
- [x] 6.3 Re-run checks (type-check, lint, i18n:lint, unit, e2e) and visual screenshot at 390×844
- [x] 6.4 Round-3 scrim polish (canvas feedback): uniform full-screen blur replaced with a light 40% wash + bottom-gradient wash + masked gradient blur (strong near the dial, fading to none by mid-screen); tab bar lifted above the scrim — visible and tappable while the dial is open; the dial dismisses on route change (justified `watch` on `route.fullPath` in SpeedDialFab)
- [x] 6.5 FAB stacking fix: after lifting the tab bar above the scrim, the bar painted over the straddling FAB — FAB wrapper raised to `z-50` and its overlap set to 40px (`-mb-10`), matching the approved canvas geometry (16px of the FAB above the bar's top edge)
- [x] 6.6 Narrow-screen fit: fixed 70px tabs replaced with fluid `flex-1` (490→390px unchanged visually, 375/360px fit); below 380px a compact mode kicks in — `mx-3` margins, 48px central slot, 9px labels (fits down to 320px; verified at 330/360/390 with screenshots)
