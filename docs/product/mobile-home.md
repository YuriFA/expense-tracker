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

- expense summary for the selected period;
- period selector;
- "All expenses" card (latest expense + period expense list);
- spending by category;
- category creation;
- quick actions;
- bottom navigation;
- central transaction Speed Dial.

### Explicitly excluded

The initial Home screen does not include:

- spending limits / budgets;
- debts;
- Pro / subscription functionality;
- transaction search;
- overflow / "more" menu.

These features should not be introduced merely because they exist
in the visual reference.

---

## Information Hierarchy

The Home screen should prioritize information in approximately this order:

1. Current period and total expenses.
2. Spending breakdown by category.
3. "All expenses" card (latest expense → full period expense list).
4. Quick access to common financial sections.
5. Transaction creation.

The exact visual hierarchy may evolve during UI implementation.

---

## Period

The user can select the period for which spending information is displayed.

**Month is the only supported period.** The current month is selected
by default; the user navigates between months with previous/next
controls. Navigation into future months is not available (there is no
spending data ahead of the current month). Additional granularities
(week, year) may be added later without changing this model.

Changing the selected period should update all Home data that is
period-dependent.

At minimum, this includes:

- total expenses;
- spending by category;
- the "All expenses" card (latest expense and its expense list).

---

## Expense Summary

The Home screen displays the total amount of expenses for the selected period.

The summary should represent expenses, not income.

The exact presentation of currency, amount formatting, and visual treatment
is a UI concern and may change during implementation.

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
ordering is explicitly decided later.

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

Selecting the card opens a **bottom sheet** with the list of expenses
for the currently selected period (month). The list is
expenses-only; income and transfers are not included.

The card is period-scoped: navigating to another month updates both
the latest-expense preview and the bottom-sheet list.

---

## Empty State (No Expenses)

When the selected period contains no expenses, the Home screen keeps
its layout stable — no sections are hidden or rearranged:

- the expense summary shows **0** in the user's currency;
- the "All expenses" card and the spending-by-category section show a
  friendly empty message (e.g. "No expenses this month") with a hint
  toward creating a transaction via the Speed Dial.

---

## Quick Actions

The Home screen provides quick access to frequently used areas:

- Accounts
- Income
- Goals

These actions navigate to the corresponding application areas.

The quick-action set is intentionally limited to functionality that
currently exists or is planned as part of the product.

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

The navigation structure should remain focused on the currently
available product areas.

Do not add navigation destinations solely because they appear in
the reference design.

---

## Visual Direction

The initial visual direction is based on the provided reference.

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

## Non-Goals

This document does not define:

- React Native component architecture;
- NativeWind implementation;
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
