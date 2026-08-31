# Proposal: web-unified-transaction-entry

## Why

On desktop (≥768px) the web app offers several inconsistent ways to add a
transaction: the dashboard quick actions (three buttons, each opening its own
per-type dialog), the sidebar CTA «Добавить операцию» (a tabbed modal), and the
transactions page header button (the same tabbed modal). Two competing flow
patterns and four triggers fragment the primary action of the product. The
mobile-web shell already solved "add from any screen" with the FAB speed-dial
(`web-mobile-bottom-nav`); desktop needs the same consolidation. An approved
design exists (superdesign project `e8178e09-b9a9-48f6-af10-99060c3efede`,
draft `ec985bff-1ac8-4430-8a90-ef3f37f4f60c` — variants A+D, flow presentation
P0), so the contract can be pinned down now.

## What Changes

- **BREAKING (UI)**: The dashboard quick actions row («Добавить расход /
  Добавить перевод / Добавить доход») is removed at ALL viewports. Below 768px
  the FAB speed-dial already provides the same creation entries; on desktop the
  unified trigger replaces them.
- The desktop sidebar CTA «Добавить операцию» becomes THE single persistent
  add trigger: a full-width teal pill in the sidebar (visual emphasis pass:
  `h-10`, hover lift ≤2px) with a kbd «N» hint shown on hover. It opens the
  existing unified creation flow — the centered modal «Новая транзакция» with
  the Расход / Доход / Перевод tabs (`AddTransactionTabs`) — unchanged.
- A keyboard shortcut «N» (ignored while typing in inputs) opens the same flow.
- A command palette (⌘K / Ctrl+K) opens a centered ~480px modal with a search
  input and add actions (Добавить расход, Добавить доход, Добавить перевод,
  Новая категория); each action opens the unified flow (expense/income
  preselect the matching tab). The palette is an accelerator, never the only
  path.
- The transactions page header button «Создать» stays as a contextual trigger
  to the same unified flow.
- The mobile navigation shell (<768px: bottom tab bar, FAB speed-dial, mobile
  top bar) is unchanged.
- Presentation-only change: no API/OpenAPI, data, or sync behavior changes.
  Visual style follows Direction D «Бумага» tokens (`.superdesign/design-system.md`).

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `web-screens`: the Dashboard screen requirement loses the quick-actions
  clause and its scenario; the Quick income entry requirement is re-pointed to
  the unified creation entry (parity essence kept: income creation in a
  minimal number of steps); the Transaction occurrence date requirement wording
  drops the quick-income-entry reference; a new requirement pins the
  transaction creation entry points (desktop triggers, unified flow, hotkey,
  palette).

## Impact

- `apps/web/src/pages/dashboard/`: `QuickActionsCard.vue` removed, page
  composition updated; dashboard e2e and `dashboard.quickActions.*` i18n keys
  cleaned up.
- `apps/web/src/app/layout/`: `AppSidebarNav.vue` CTA emphasis + kbd hint; one
  dialog instance for the add flow stays in the sidebar.
- New: global hotkey handling and a command palette component (app-level, in
  the app shell / features layer per FSD), reachable from any page.
- `apps/web/src/features/transaction/add/`: reused as-is (tab preselection via
  props from the palette actions).
- `apps/web/e2e/`: dashboard quick-action testids replaced by the new trigger
  testids; `mobile-shell.spec.ts` unchanged.
- Canvas/design consistency: `.superdesign` route drafts and
  `design-system.md` already synced to this decision (draft `ec985bff` is the
  canonical dashboard state).
