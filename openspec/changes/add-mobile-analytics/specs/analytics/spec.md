## Purpose

Period-scoped spending and income insight on mobile: category distribution
of expenses and income over a selected week, month, or year, rendered as
donut charts with legends and per-category breakdowns, computed entirely
from the user's local data.

## ADDED Requirements

### Requirement: Analytics tab overview

The analytics tab SHALL show two summary cards — expenses («Расходы») and
income («Доходы») — for the current device-local month. Each card SHALL show
the direction's month total, a donut chart of the per-category distribution,
and a color-matched legend of the largest categories. Selecting a card SHALL
open the detail screen for that direction. The tab SHALL render entirely
from local data with no network dependency.

#### Scenario: Overview cards with data

- **WHEN** the current month contains expenses and income across several categories
- **THEN** both cards show their direction totals, donut charts whose segment colors match the category colors, and legends whose markers use the same colors as their segments

#### Scenario: Opening a detail screen

- **WHEN** the user selects the expenses card (likewise the income card)
- **THEN** the detail screen for that direction opens

#### Scenario: Month without data

- **WHEN** the current month contains no transactions of a direction
- **THEN** that card shows an empty-state message in place of the donut chart and legend, and the card remains selectable

#### Scenario: Analytics offline

- **WHEN** the user opens the analytics tab with no connectivity after transactions have been recorded or synced locally
- **THEN** the overview cards render the local figures

### Requirement: Detail screen period selection

The detail screen SHALL offer a three-way period selector — week («Неделя»),
month («Месяц»), year («Год») — with month selected by default and the
active option visually marked and exposed as selected to accessibility
services. Switching the period kind SHALL select the current period of the
new kind.

#### Scenario: Default period on open

- **WHEN** the user opens a detail screen
- **THEN** month is the selected period kind and the current month is the selected period

#### Scenario: Switching period kind

- **WHEN** the user selects «Неделя»
- **THEN** the screen shows the current week's figures and «Неделя» is the marked, accessibly selected option

### Requirement: Period navigation

The detail screen SHALL provide previous/next controls that step one period
at a time, and SHALL display a human-readable label of the selected period's
inclusive date range in the app's date locale: a week as its first and last
day («3 августа – 9 августа», Monday through Sunday), a month as its first
and last day («1 августа – 31 августа»), a year including the year («1
января – 31 декабря 2026»). Labels SHALL include the year whenever the range
spans two calendar years or would otherwise be ambiguous. Navigation SHALL
NOT be blocked at the current period: future periods are reachable and
display their (normally empty) state like any other period.

#### Scenario: Stepping weeks

- **WHEN** the selected period is the week of 3–9 August and the user steps next
- **THEN** the screen shows the week of 10–16 August

#### Scenario: Stepping months

- **WHEN** the selected period is August and the user steps next
- **THEN** the screen shows September with its full range label

#### Scenario: Stepping years across the year boundary

- **WHEN** the selected period is a year and the user steps next
- **THEN** the screen shows the following year with a label that includes it

#### Scenario: Navigating into the future

- **WHEN** the selected period is the current period and the user steps next
- **THEN** the next (future) period is shown with its empty state and both navigation controls remain enabled

### Requirement: Period attribution

A transaction SHALL belong to the selected period iff its occurred-at
instant falls within that period in the device's local timezone. Weeks SHALL
start on Monday. This attribution SHALL be identical across every
period-scoped figure shown on a screen (totals, donut segments, legend,
category rows, percentages).

#### Scenario: Transaction at a period boundary

- **WHEN** a transaction occurs at 00:30 local time on the first day of a week, month, or year
- **THEN** it is attributed to that new period in every period-scoped figure and to no figure of the preceding period

#### Scenario: Transaction at the end of a period

- **WHEN** a transaction occurs at 23:30 local time on the last day of a period
- **THEN** it is attributed to that period and not to the following one

### Requirement: Category breakdown

The detail screen SHALL list every category with movement in the selected
period and direction, ordered by total descending, each row showing the
category's amount and its percentage of the direction total, plus a leading
non-interactive summary row («Все расходы» / «Все доходы») with the direction
total and 100%. Amounts SHALL be displayed through the app's existing money
formatting; percentages SHALL be shown with at most two fractional digits.
Transfers SHALL be excluded from both directions: a transfer is neither
income nor expense.

#### Scenario: Breakdown with percentages

- **WHEN** the selected period contains expenses of 20 113 ₽ in «Такси» out of 30 325 ₽ total
- **THEN** the breakdown lists «Такси» with its amount and percentage (66,32%) in descending order below the summary row showing 30 325 ₽ and 100%

#### Scenario: Transfers excluded

- **WHEN** the selected period contains transfers between the user's accounts
- **THEN** they appear in neither the expenses nor the income figures

#### Scenario: Single category in period

- **WHEN** the selected period contains movement in exactly one category
- **THEN** that row shows 100% and the summary row shows the same total

### Requirement: Donut presentation

Donut charts SHALL render one segment per displayed category, sized
proportionally to the category's share of the direction total, colored with
the category's color, with a small visual gap between segments. Charts SHALL
display at most five categories individually; the remainder SHALL be
aggregated into one «Прочие» segment, and the accompanying legend SHALL
mirror exactly what the chart shows. A period with movement in exactly one
category SHALL render as a full ring without gaps. A period with no movement
SHALL NOT render a chart; the empty state takes its place. The donut center
SHALL show the direction total on the tab cards and the selected period's
range label on the detail screen.

#### Scenario: Many categories aggregate into «Прочие»

- **WHEN** the selected period has movement in seven categories
- **THEN** the donut shows the five largest categories plus one «Прочие» segment covering the remaining two, and the legend lists those six entries

#### Scenario: Segment colors match categories

- **WHEN** a category with a violet color is among the displayed categories
- **THEN** its donut segment and its legend marker are both violet

#### Scenario: No chart without data

- **WHEN** the selected period contains no transactions of the direction
- **THEN** no donut chart is rendered and an empty-state message (e.g. «Нет расходов за этот период») is shown instead

### Requirement: Currency of analytics figures

Analytics totals SHALL be sums of transaction amounts as-is in integer minor
units, with no currency conversion, displayed through the app's existing
money formatting. Mixed-currency aggregation behavior is intentionally
undefined in v1, consistent with the Home screen's single-currency decision
(`docs/product/mobile-home.md`).

#### Scenario: Totals are plain minor-unit sums

- **WHEN** the selected period contains transactions of 20 113 ₽ and 10 212 ₽ in one direction
- **THEN** the direction total is exactly 30 325 ₽, computed as an integer sum of minor units
