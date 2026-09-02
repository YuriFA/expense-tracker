# Design: web-mobile-drawers

## Context

Census (2026-09-01): 30 modal surfaces in `apps/web` — 23 centered `Dialog`s
(forms and scrollable lists), 6 `AlertDialog` confirms, 1 right-side `Sheet`
(transactions filters). All are `v-model:open`-driven; forms follow the
vee-validate + Zod schema-factory pattern (vue-patterns §3); the "one dialog
instance outside the loop + active-item ref" rule is vue-patterns §4. The
app shell already JS-gates mobile vs desktop at 768px
(`useMediaQuery('(min-width: 768px)')` in `AppShell.vue`), and the mobile
shell (bottom tab bar + FAB speed-dial) landed in change
`2026-08-31-web-mobile-bottom-nav`.

The installed reka-ui 2.10.3 ships a full Drawer primitive (`DrawerRoot`,
`DrawerPortal`, `DrawerContent`, `DrawerHandle`, `DrawerTitle`,
`DrawerDescription`, `DrawerClose`, `DrawerTrigger`, `DrawerViewport`,
`DrawerSwipeArea`) with `snap-points`, `swipe-direction`, controlled
`v-model:open` (close reasons include `swipe`), and a
`data-nested-drawer-open` content attribute. The current shadcn-vue Drawer is
a thin styling layer over exactly this primitive, so the repo's existing
reka-ui base covers everything; **vaul-vue is not needed**.

RN prior art (the parity target): bottom-sheet forms with stacked picker
sheets — `apps/mobile/src/shared/ui/{account-picker-sheet,
category-picker-sheet,date-picker-sheet}`; `mobile-transaction-edit` spec:
"Each picker row (account, category, date) SHALL open a picker sheet stacked
above the edit sheet". RN allows swipe-dismiss of forms with unsaved input
(no dirty guard; tracked there as `TODO(sheet-dismiss)`), and had a
sheet-in-sheet accessibility incident (docs/technical-debt.md, RESOLVED
2026-08-25) whose fix requires every sheet in a stack to stay exposed to the
accessibility tree (mobile-forms spec lines 112–118) — the web analogue must
verify the same for stacked drawers.

## Goals / Non-Goals

**Goals:**

- One idiom switch at the existing 768px breakpoint: bottom-sheet drawers for
  forms/lists below, centered dialogs above; desktop visually equivalent to
  today (the header markup is unified through the wrapper, so the DOM is not
  byte-identical — behavior is pinned by the desktop e2e).
- Stacked picker drawers (account, category, date) inside form drawers.
- Reuse reka-ui's Drawer primitive — zero new dependencies.
- Accessibility of the open drawer stack (web mirror of mobile-forms
  112–118).
- Spec-first: the D1 reversal recorded as a delta to `web-screens`.

**Non-Goals:**

- No dirty-guard on swipe-dismiss (RN parity; accepted data-loss semantics,
  same as closing any dialog today).
- No conversion of destructive AlertDialogs, the command palette, the
  transactions date-range popover (`TransactionsDateFilter.vue`), or the
  plans form's native date input.
- No RN or `packages/*` changes; no fix for the registered
  `TransactionsItemsList` dialog defect (docs/technical-debt.md:57) beyond
  migrating it as-is.

## Decisions

1. **Primitive: reka-ui Drawer, not vaul-vue.** vaul-vue (the library behind
   older shadcn-vue drawers) would duplicate what reka-ui 2.10.3 already
   exports, and the current shadcn-vue Drawer template targets the reka-ui
   primitive. Alternative — restyling the existing `Sheet` to
   `side="bottom"` — rejected: it is a plain slide panel without drag
   physics, which is the entire UX point.
2. **`shared/ui/drawer/` mirrors `sheet/`**: SFC parts + folder `index.ts`
   barrel, reka `Drawer*` underneath, `tw-animate-css` classes like the
   other overlays. Content styling: bottom edge, drag handle, inner scroll
   area with a `dvh`-bounded max height, `env(safe-area-inset-bottom)`
   padding for PWA standalone mode.
3. **Explicit `shared/ui/responsive-dialog/` wrapper, not a responsive
   `Dialog`.** The wrapper owns `useMediaQuery('(min-width: 768px)')` and
   renders drawer presentation below, the existing `dialog/` above, with
   `v-model:open` + title/description/default/footer slots. ~24 call sites
   swap imports — mechanical, greppable, trivially exemptible per surface.
   Alternative — making `DialogContent` itself drawer-shaped on mobile —
   rejected: blanket behavior change across every consumer, exceptions become
   hard, and the pattern stops being visible at call sites. The wrapper must
   allow tests to pin the presentation (matchMedia stub or an injectable
   override) so jsdom-based desktop assertions stay valid.
4. **Responsive select variant in `shared/ui/select/`; the entity selects
   are the seam.** `AccountSelect` (6 consumers) and `CategorySelect`
   (3 consumers) swap to the responsive variant internally; their consumers
   don't change. Desktop keeps the reka Select presentation; mobile renders a
   trigger + stacked drawer list.
5. **New `shared/ui/date-field/`.** The web had no date-field wrapper —
   Popover+Calendar is wired inline per form. The component: desktop =
   Popover+Calendar (today's presentation), mobile = quick-date chips + a
   calendar drawer (RN `DatePickerSheet` parity). Rewires
   `features/transaction/add/ui/CashflowForm.vue`, `TransferForm.vue`, and
   `pages/transactions/ui/FilterCustomDate.vue`. `PlanFormDialog`'s native
   `<input type="date">` stays — it already opens the OS picker on phones.
6. **Swipe-dismiss allowed everywhere, no dirty-guard.** RN parity; reka's
   `update:open` details carry the close reason, so a guard can be added
   later via controlled `open` without an API change. Note: reka's Drawer
   documents no `dismissible` prop — any future "block dismissal" logic must
   go through controlled state.
7. **AlertDialogs and the command palette are exempt.** The 6 destructive
   confirms keep focused-attention semantics at every viewport; the command
   palette is desktop-only. Nested `AlertDialog`s inside migrated form
   drawers (debts/plan forms, household code) stay centered.
8. **Pilot-first within a single change.** Task order: primitives →
   add-transaction pilot (heaviest nesting: selects + date field +
   dialog-in-dialog) → verify stack/a11y/keyboard/safe-area → mechanical
   rollout of the remaining surfaces → filters sheet. The pilot is the gate;
   rollout starts only after its checklist passes.

## Risks / Trade-offs

- [Drawer-in-drawer stacking + a11y] → verified in the pilot against the
  mobile-forms stacking requirement; reka exposes `data-nested-drawer-open`
  for styling; the RN incident is the cautionary prior art.
- [Swipe-dismiss loses typed form input] → accepted (RN parity; same as
  closing a dialog today). RN tracks a debt ticket for the same behavior
  (`TODO(sheet-dismiss)`), so a future guard lands in both apps or neither.
- [Mobile-browser keyboard/scroll inside `dvh`-bounded drawers] → pilot
  checklist item on 390×844 browser + PWA standalone emulation.
- [~24 call sites churn mid-change] → each migration is a single mechanical
  import swap; desktop unit/e2e suites must stay green untouched, which
  bounds regression risk.
- [Filters popover-calendar inside the drawer] → the transactions filters'
  `TransactionsDateFilter` Popover+RangeCalendar stays as-is inside the
  drawer (reka layers compose); converting it is a fast-follow.

## Migration Plan

Client-only, presentation-only. Ship as ordered commits inside the change
(primitives → pilot → rollout → filters → tests/docs); rollback = revert.
The spec delta syncs to `openspec/specs/web-screens/spec.md` at completion
(sync-specs → archive).

## Open Questions

None — scope, breakpoint, primitive, nesting, dismissal semantics, and
staging were settled during the design interview (2026-09-01).
