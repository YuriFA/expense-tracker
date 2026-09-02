## MODIFIED Requirements

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
- **THEN** that card still renders its donut chart — as a single neutral grey ring with the direction's zero total in the center — shows the empty-state message in place of the legend, and the card remains selectable

#### Scenario: Analytics offline

- **WHEN** the user opens the analytics tab with no connectivity after transactions have been recorded or synced locally
- **THEN** the overview cards render the local figures

### Requirement: Donut presentation

Donut charts SHALL render one segment per displayed category, sized
proportionally to the category's share of the charted total, colored with
the category's color, with a small visual gap between segments. The tab
cards' small charts SHALL display at most five categories individually; the
remainder SHALL be aggregated into one «Прочие» segment, and the accompanying
legend SHALL mirror exactly what the chart shows. The detail chart SHALL
display every included category individually — no cap and no «Прочие»
aggregate. A period with movement in exactly one category SHALL render as a
full ring without gaps. When the period has no movement, the tab cards
SHALL render the chart as a single neutral grey ring with the direction's
zero total in the center, and SHALL show the empty-state message in place
of the legend (the detail screen likewise renders its zeroed full layout —
see the breakdown requirement). The donut center SHALL show the direction
total on the tab cards and the selected period's range label on the detail
screen.

#### Scenario: Many categories aggregate into «Прочие»

- **WHEN** the current month has movement in seven categories
- **THEN** the tab card's donut shows the five largest categories plus one «Прочие» segment covering the remaining two, and the legend lists those six entries

#### Scenario: Segment colors match categories

- **WHEN** a category with a violet color is among the displayed categories
- **THEN** its donut segment and its legend marker are both violet

#### Scenario: Empty period renders the neutral ring (tab cards)

- **WHEN** the current month contains no transactions of a direction
- **THEN** that tab card's donut renders as a single neutral grey ring with the zero direction total in its center, and the empty-state message (e.g. «Нет расходов за этот период») is shown in place of the legend
