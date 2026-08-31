# Design: web-unified-transaction-entry

## Context

Today there are two creation-flow patterns behind four triggers: the tabbed
modal `AddTransactionTabs` (sidebar CTA in `AppSidebarNav.vue`, «Создать» on
`TransactionsPage.vue`) and three per-type dialogs (`CashflowForm` /
`TransferForm`) hosted by `QuickActionsCard.vue` (all viewports) and
`SpeedDialFab.vue` (<768px). Each host keeps its own `ref(false)` open flag.
There is no global key handling anywhere in the app. The visual target is the
approved superdesign draft `ec985bff-1ac8-4430-8a90-ef3f37f4f60c` (project
`e8178e09-b9a9-48f6-af10-99060c3efede`): Direction D «Бумага», full-width
sidebar CTA with hover kbd «N», ⌘K command palette specimen, centered tab
modal unchanged. Canvas/design-system sync for this decision is already done
(`.superdesign/design-system.md`, route drafts, `AppSidebar` component v2).

## Goals / Non-Goals

**Goals:**

- Exactly one creation flow per viewport class, reachable from any screen.
- Kill the quick-actions pattern and its duplicate dialogs.
- Keep the `<768px` mobile shell (FAB speed-dial) untouched.
- Make the new triggers feel native to the desktop web idiom (hotkey, palette).

**Non-Goals:**

- No redesign of the creation form itself (tabs modal stays as-is, per P0).
- No changes to the RN mobile app or the web API/OpenAPI contract.
- No general navigation/search palette scope — palette actions are creation
  actions only (create expense/income/transfer, new category).
- No tablet-specific layout (768px remains the single shell boundary).

## Decisions

- **One dialog host for the desktop flow.** Extract a module-scope controller
  in `features/transaction/add` — `useAddTransactionDialog()` exposing
  `open(preselect?: 'expense' | 'income' | 'transfer')` — plus a single
  `<AddTransactionDialogHost>` rendering `AddTransactionTabs` in the existing
  centered modal, mounted once in `AppShell.vue`. The sidebar CTA, hotkey,
  palette, and the transactions-page button all call `open(...)`.
  Rationale: honors the "one dialog instance per flow" convention literally
  (today the sidebar and the transactions page each mount their own); keeps
  tab preselection via the existing props seam. Alternative considered —
  keep per-host dialogs and duplicate them in the palette — rejected: three
  mounted instances of the same flow and three sources of truth for the open
  state.
- **Hotkey «N» by physical key.** Listen with `useEventListener`/
  `keydown` matching `event.code === 'KeyN'` without modifiers, ignoring
  editable targets (`input`, `textarea`, `select`, `contenteditable`) and any
  open overlay. `event.code` is layout-independent, so the same physical key
  works on ЙЦУКЕН (Н). No new dependency (vueuse is already used).
  Alternative — `useMagicKeys` — fine too; plain listener keeps the
  reactivity budget untouched.
- **Palette placement: new widget `widgets/command-palette/`.** It renders on
  every page and knows domain actions (transactions, categories) — same
  justification as `widgets/mobile-shell/` ("shell renders on every page");
  `app/` stays a composition root and only mounts it. ⌘K / Ctrl+K toggles it;
  activating an add action closes the palette and calls
  `useAddTransactionDialog().open(type)`; the new-category action opens the
  existing `NewCategoryDialog`. Alternative — `features/command-palette/` —
  rejected for shell-level parity with mobile-shell; `shared/` is banned
  (domain knowledge).
- **Quick-actions removal is unconditional (all viewports).** Below 768px the
  FAB speed-dial already offers the same three creation entries, so deleting
  `QuickActionsCard.vue` needs no viewport gating; the dashboard grid simply
  loses its quick-actions row. `dashboard.quickActions.*` i18n keys and
  `quick-action-*` testids are removed.
- **Sidebar CTA emphasis is CSS-only.** Full-width pill stays the
  `DialogTrigger` it is today; visual pass matches the approved draft
  (`h-10`, hover lift ≤2px, kbd «N» chip visible on hover). The kbd chip and
  palette visuals follow `.superdesign/design-system.md` (kbd 20×20, border
  #e8e0d4, fill #f0e9dd; palette ~480px, hover row teal tint #d9efec).

## Risks / Trade-offs

- [Chrome/Edge bind Ctrl+K / ⌘K to the address bar] → intercept with
  `preventDefault` on the app-level keydown (works while the page has focus,
  the common case; PWA standalone has no browser binding). If it proves
  unreliable in practice, a secondary binding (e.g. «/») can be added later
  without spec changes — the spec pins the accelerator, not the exact chord.
- [Palette grows into a navigation/search tool] → scope held to creation
  actions per the spec; the widget's action list is a plain array, trivially
  extensible later.
- [Shared dialog host touches existing hosts] → the refactor is mechanical
  (replace local `Dialog` + open-ref with `open(...)` calls); covered by
  existing e2e for the sidebar and transactions page plus new specs for the
  hotkey/palette.
- [Hotkey surprises users on data-entry screens] → editable-target guard plus
  the visible kbd hint on the CTA; the CTA itself remains the primary path.

## Migration Plan

Single web PR: add host/controller and new widget, rewire two existing
triggers, delete `QuickActionsCard.vue` and dead i18n keys, update e2e.
No data, API, or sync changes; rollback = revert the PR. Canvas/design-system
consistency is already in place on `.superdesign`, so no follow-up design work
is required during implementation.

## Open Questions

None. Flow presentation (P0: centered tab modal) and trigger set (sidebar CTA
+ «N» + ⌘K palette + transactions-page button) were decided via the
superdesign review rounds; the mobile shell is out of scope.
