## ADDED Requirements

### Requirement: Dashboard screen

The web dashboard SHALL show a month-scoped overview composed of: summary stat cards for
the total balance across accounts, the period's income, the period's expenses, and the
net debt position (total receivable minus total payable); a breakdown of the period's
expenses by category; and the period's most recent transactions. It SHALL additionally
show period-independent snapshots — the accounts with their balances and the debtor
balances by direction — and quick actions offering entry points for creating an expense,
a transfer, and an income via the quick income entry. Month-scoped figures SHALL
attribute transactions to periods per the `analytics` capability, and money figures
SHALL be formatted per the `app-currency` capability.

#### Scenario: Overview of the current month

- **WHEN** the user opens the dashboard in a month with income and expenses
- **THEN** the income and expense stat cards, the category breakdown, and the recent transactions list show that month's figures

#### Scenario: Snapshot figures are not month-scoped

- **WHEN** the user switches the dashboard month
- **THEN** the accounts total and balances and the debtor balances remain unchanged

#### Scenario: Quick actions

- **WHEN** the user uses the dashboard quick actions
- **THEN** entry points for creating an expense, a transfer, and an income (via the quick income entry) are available

### Requirement: Dashboard period navigation

The dashboard SHALL provide month navigation: it opens on the current device-local month;
the backward step SHALL have no lower bound; the forward step SHALL be unavailable while
the selected month is the current month. Switching the month SHALL rescope every
month-scoped dashboard figure — the income and expense stat cards, the category
breakdown, and the recent transactions list — to the selected month. The selected month
SHALL NOT persist: opening the dashboard anew starts on the current month.

#### Scenario: Stepping to the previous month

- **WHEN** the user steps back from the current month
- **THEN** the month label shows the previous month, and the income stat, expense stat, category breakdown, and recent transactions show that month's figures

#### Scenario: Forward step bounded at the current month

- **WHEN** the selected month is the current month
- **THEN** the forward step is not offered

#### Scenario: Category breakdown follows the selected month

- **WHEN** the user selects a month other than the current one
- **THEN** the category breakdown lists that month's expenses by category

#### Scenario: Selection does not persist

- **WHEN** the user selects an earlier month and opens the dashboard again
- **THEN** the dashboard starts on the current month

### Requirement: Transaction occurrence date at creation

The web forms for creating a transaction — expense, income, transfer, and the quick
income entry — SHALL offer a day-level occurrence date choice that defaults to the
moment the form was opened and allows selecting any day, past or future. Changing the
selected day SHALL preserve the clock time captured when the form was opened, and the
created transaction's occurred-at SHALL carry the chosen day with that time.

#### Scenario: Back-dating an expense

- **WHEN** the user creates an expense with the occurrence date set to an earlier day
- **THEN** the created transaction occurs on the chosen day and appears under that date in history

#### Scenario: Untouched date defaults to now

- **WHEN** the user submits a creation form without changing the date
- **THEN** the transaction's occurred-at is the moment the form was opened
