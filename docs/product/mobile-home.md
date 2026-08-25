# Mobile Home

## Purpose

The Home screen is the main entry point of the mobile application.

Its primary purpose is to give the user a quick overview of their
spending for the selected period and provide fast access to common
financial actions.

The screen should prioritize quick comprehension and frequent daily
interactions over detailed financial management.

---

## Scope

### Included

The initial Home screen includes:

- header summary with switchable modes (expenses / monthly balance /
  total balance);
- period selector;
- "All expenses" card (latest expense + period expense list);
- spending by category;
- category creation;
- quick actions;
- bottom navigation;
- central transaction Speed Dial.

### Explicitly excluded

The initial Home screen does not include (reference counterparts in
parentheses):

- spending limits / budgets (the "Лимит" card);
- Pro / subscription functionality (the "PRO" crown button);
- transaction search (the header search icon);
- overflow / "more" menu (the "···" header button, the "Ещё" tab).

These features should not be introduced merely because they exist
in the visual reference.

---

## Information Hierarchy

The layout follows the reference's vertical order:

1. Quick actions row (Счета / Доходы / Долги).
2. Header summary: mode title (e.g. "Расходы"), total amount, period
   range with previous/next navigation.
3. "All expenses" card (latest expense → full period expense list).
4. Spending by category (with the "Новая категория" entry).
5. Transaction creation via the persistent central Speed Dial.

The exact visual hierarchy may evolve during UI implementation.

---

## Period

The user can select the period for which spending information is displayed.

**Month is the only supported period.** The current month is selected
by default; the user navigates between months with previous/next
controls. Navigation into future months is not available (there is no
spending data ahead of the current month). Additional granularities
(week, year) may be added later without changing this model.

**The period is a page-global filter**: it applies to every
period-dependent section of the Home screen, not just the header
summary. The selector stays visible regardless of the summary mode.

Changing the selected period updates:

- the header summary (in the Expenses and Monthly balance modes; the
  Total balance number is a period-independent snapshot);
- spending by category;
- the "All expenses" card (latest expense and its expense list).

---

## Summary Modes

The header card displays one total at a time; **Expenses is the
default mode**. A small chevron next to the title opens a **bottom
sheet** for switching between three modes:

1. **Расходы (Expenses)** — total expenses for the selected period.
2. **Баланс за месяц (Monthly balance)** — income minus expenses for
   the selected period. Transfers do not affect it: a transfer moves
   money between the user's own accounts and is neither income nor
   expense.
3. **Баланс общий (Total balance)** — the current total balance across
   all the user's accounts. This is a point-in-time snapshot: the
   number itself is not affected by the selected period, but the
   period selector stays visible and keeps filtering the page's other
   period-dependent sections.

Switching the mode changes only the header total; the rest of the
screen (spending by category, the "All expenses" card) stays
expense-based and unchanged.

When the selected mode's value is zero (no expenses, no activity, or
no accounts), the summary shows **0** rather than an empty state.

Reference presentation: a bold mode title ("Расходы"), the total below
it in a large typeface with the currency symbol (e.g. "26 813 ₽"), and
the selected month's date range with previous/next arrows beside the
amount (e.g. "< 1 АВГ. — 31 АВГ. >").

Data notes (v1 needs no new API): expense and income totals are
derivable from the existing transaction list filtered by type and
period; the total balance is the existing account balances summary.
The exact presentation of currency, amount formatting, and visual
treatment is a UI concern and may change during implementation.

---

## Currency

**Current model: single currency.** The Home screen assumes the user's
accounts — and therefore their expenses — are in **one currency**. All
amounts (expense summary, category totals, the expense list) are
displayed in that currency; no conversion is performed.

**Intended future model: conversion into a primary currency.** When
multi-currency accounts become a real scenario, spending should be
converted into the user's primary currency before aggregation. This
requires an exchange-rate subsystem that does not exist yet; building
it is future work outside this change. Until then, mixed-currency
behavior on Home is explicitly undefined (tracked in
`docs/assumptions.md`).

---

## Spending by Category

The Home screen displays spending grouped by category.

Each category entry should provide:

- category identity;
- amount spent during the selected period;
- relative indication of spending where useful.

Categories should be ordered by spending amount unless a different
ordering is explicitly decided later. (The reference's visible rows —
Такси 19 313 ₽, Кафе 3 000 ₽, Животные 4 500 ₽ — are not in descending
order; the amount-descending rule still applies to our implementation.)

Reference presentation: a white rounded list block whose first row is
"Новая категория" with a plus icon, followed by category rows — a
gradient-filled circular icon, the category name, and the amount.

Selecting a category should provide a path to transactions associated
with that category.

**Selecting a category opens a bottom sheet** listing that category's
expenses for the selected period — the same sheet pattern as the "All
expenses" card, additionally filtered by category. The API already
supports this filter combination (category + expense type + inclusive
date range) with no backend change.

When the user has no categories, the section shows an empty message
with an action to **create a category**. Category creation is in scope
for the Home screen: without an expense category the user cannot record
an expense at all, and deleting all seeded categories is the only way
into this state.

---

## "All Expenses" Card

The Home screen contains a card titled "All expenses" (localized,
e.g. «Все расходы» in RU).

The card shows the **most recent expense of the selected period** with
enough information for the user to recognize it without opening the
transaction details.

Reference presentation: the latest expense as relative date + amount +
category name (e.g. "Последний сегодня 4 500 ₽, Животные"). In the
reference the card is half-width, paired with the excluded "Лимит"
card; without it the card may take full width — exact layout is a UI
concern.

Selecting the card opens a **bottom sheet** with the list of expenses
for the currently selected period (month). The list is
expenses-only; income and transfers are not included.

The card is period-scoped: navigating to another month updates both
the latest-expense preview and the bottom-sheet list.

---

## Empty State (No Expenses)

When the selected period contains no expenses, the Home screen keeps
its layout stable — no sections are hidden or rearranged:

- the header summary shows **0** (per the selected mode);
- the "All expenses" card and the spending-by-category section show a
  friendly empty message (e.g. "No expenses this month") with a hint
  toward creating a transaction via the Speed Dial.

---

## Quick Actions

The Home screen provides quick access to frequently used areas:

- **Accounts** — navigates to the existing Accounts area.
- **Income** — navigates to the dedicated income screen: the month-scoped
  composition mirrored for income only (fixed "Доходы" summary with the
  month's income total — no balance modes, the all-incomes card with a
  day-grouped list sheet, and the per-category income breakdown with a
  category detail sheet). Data behavior is specified in
  `openspec/specs/mobile-local-data` ("Income screen data behavior").
- **Debts** — navigates to the dedicated debts screen: debtors and debt
  operations in two independent directions («Мне должны» / «Я должен»)
  with balances derived from the operation history. Data behavior is
  specified in `openspec/specs/mobile-local-data` ("Debts screen data
  behavior"). Goals remain a deferred product idea without a tile.

The quick-action set is intentionally limited to functionality that
currently exists or is planned as part of the product.

Reference presentation: a row of four large square soft-rounded tiles
with 3D-style icons and labels below (Счета, Доходы, Цели, Долги). The
implementation keeps three of them — the "Цели" (Goals) tile is
deferred without a tile until the feature is designed.

---

## Transaction Speed Dial

The central action in the bottom navigation is a Speed Dial used
for transaction creation.

The collapsed state displays a primary action.

Activating it expands three actions — **Expense**, **Income**, and
**Transfer** — matching the three transaction types the API supports.
Each action opens the corresponding create-transaction flow.

Exact interaction details (animation, dismissal behavior) are UI
concerns and may be adjusted during implementation.

---

## Bottom Navigation

The Home screen is part of the mobile application's bottom navigation.

The shipped tab set is **Dashboard, Планы, Аналитика, Settings** plus the
central Speed Dial button (a large round accent colored "+"). The v1
decision to keep only Dashboard/Transactions/Accounts/Settings was
superseded when the reference's navigation was adopted tab by tab:
Аналитика shipped with the analytics screens, and Планы hosts the planned
payments (see `openspec/specs/planned-payments` — recurring expense/income
rules with per-type cards, manual/auto confirmation, and reminders).
Transactions live on the Dashboard; Счета, Доходы, and Долги are stack
destinations behind the Home quick actions, not tabs. The reference's
«Ещё» tab remains not adopted.

---

## Visual Direction

The initial visual direction is based on the provided reference.

Reference style, to be preserved in spirit:

- light theme: clean white / near-white background;
- soft, neumorphic-inspired rounded language: large corner radii,
  soft shadows, gently extruded tiles and buttons;
- gradient-filled circular icons for categories and action tiles;
- accents: purple/violet as the primary (central button, active tab),
  with orange, green, and blue as secondary (blue marks the period
  navigation arrows);
- prominent expense summary in a large numeric typeface;
- RU strings and ₽ in the reference — actual strings localize through
  `@expense-tracker/i18n` when mobile i18n is wired.

Deliberate deviations from the reference (all map to the exclusions
above): no "PRO" crown button, no header search icon, no "···" overflow
menu, no "Лимит" card, no "Ещё" tab.

The implementation should preserve the reference's general:

- information hierarchy;
- card-based composition;
- rounded visual language;
- prominent expense summary;
- period selection;
- category spending presentation;
- quick-action area;
- central Speed Dial concept.

Exact:

- colors;
- spacing;
- typography;
- iconography;
- border radii;
- component dimensions

are implementation/design details and may be adjusted during iteration.

---

## UI Mock Notes

The first implementation step is a UI mock on simple in-memory data.
Keep the mocks deliberately minimal: they are a temporary stand-in for
the API integration and will be replaced, not extended — no
persistence, no realistic datasets, just enough to exercise the
layout, summary modes, period navigation, empty states, and the
placeholder destinations.

---

## Non-Goals

This document does not define:

- React Native component architecture;
- NativeWind/Uniwind implementation;
- state-management approach;
- API endpoints;
- backend data model;
- database queries;
- exact visual measurements.

Those decisions belong to the relevant implementation or architecture
documents.

---

## Open Questions

None — all initial open questions have been resolved and recorded in
the sections above. New questions arising during implementation should
be added here and resolved before the corresponding API contract is
finalized.
