## 1. Unified dialog host

- [x] 1.1 In `features/transaction/add`: add a module-scope controller `useAddTransactionDialog()` (`open(preselect?: 'expense' | 'income' | 'transfer')`) and an `AddTransactionDialogHost` component rendering `AddTransactionTabs` in the existing centered modal; export both from the feature barrel
- [x] 1.2 Mount `AddTransactionDialogHost` once in `AppShell.vue` (desktop and mobile viewports both get it; it is inert unless opened)
- [x] 1.3 Rewire the sidebar CTA (`AppSidebarNav.vue`) to call `open()` instead of hosting its own `Dialog` with `AddTransactionTabs`; keep the `sidebar-add-operation` testid
- [x] 1.4 Rewire the transactions page «Создать» button to call `open()`; remove its local `Dialog`/state

## 2. Dashboard quick actions removal

- [x] 2.1 Delete `pages/dashboard/ui/QuickActionsCard.vue` and its usage in `DashboardPage.vue`; let the dashboard grid close the gap (stat cards / category breakdown spacing stays per canvas)
- [x] 2.2 Remove `dashboard.quickActions.*` i18n keys from `packages/i18n` locales (ru + en) and any references
- [x] 2.3 Update dashboard e2e: drop `quick-action-expense/transfer/income` flows, keep creation covered via the new triggers

## 3. Hotkey «N» + CTA emphasis

- [x] 3.1 Add a global keydown listener (app shell level, `useEventListener`): `event.code === 'KeyN'` without modifiers opens the flow via `open()`; ignore editable targets (`input`/`textarea`/`select`/`contenteditable`) and when any modal is already open
- [x] 3.2 Sidebar CTA visual pass per draft `ec985bff`: `h-10` full-width pill, hover lift ≤2px, kbd «N» chip (20×20, border #e8e0d4, fill #f0e9dd, 11px bold) visible on hover; i18n-safe (no raw text)

## 4. Command palette ⌘K

- [x] 4.1 Create `widgets/command-palette/` (widget per FSD: renders on every page, knows domain actions): centered ~480px modal, search input, action rows with lucide icons, hover row teal tint #d9efec, footer hint «↑↓ навигация · ↵ выбрать · esc закрыть»; keyboard navigation (arrows, enter, esc) and focus trap per dialog conventions
- [x] 4.2 Bind ⌘K / Ctrl+K with `preventDefault` at the same app-level listener; ignore while typing in text fields only for plain-char keys (the chord is allowed globally except inside the palette itself)
- [x] 4.3 Palette actions: create expense / create income / create transfer → close palette and `open(type)`; new category → open existing `NewCategoryDialog` (decouple it from form context if needed)
- [x] 4.4 i18n keys for palette (title, search placeholder, action labels reusing existing `shell.*`/`dashboard.addOperation` strings where possible, footer hint) in ru + en; `pnpm i18n:lint` passes
- [x] 4.5 e2e: palette opens via ⌘K, add actions open the unified flow with the right tab preselected, new-category opens the category dialog; testids for the palette and its actions

## 5. Verification & consistency

- [x] 5.1 e2e green: updated dashboard specs, `mobile-shell.spec.ts` untouched and passing, sidebar/transactions-page creation flows
- [x] 5.2 Repo checks: `pnpm type-check`, `pnpm arch:check` (new widget imports downward), `pnpm knip` (no dead exports after `QuickActionsCard` removal), `pnpm i18n:lint`, web app lint
- [x] 5.3 Visual spot-check at 768px boundary: desktop shell (sidebar CTA + kbd, palette) vs mobile shell (FAB speed-dial unchanged); light/dark themes
- [x] 5.4 Confirm canvas consistency: canonical drafts (`ec985bff` and synced route drafts) match the implemented UI; no canvas shows quick actions
