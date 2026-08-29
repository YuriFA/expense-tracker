# web-screens Specification

## Purpose
The web app's screen inventory and navigation contract: which screens
exist, how users reach them, and the parity principle that every domain
action available on mobile for the shared feature set is available on the
web with web-native presentation.

## Requirements

### Requirement: Screen inventory

The web app SHALL provide screens for dashboard, transactions, analytics
(overview and per-direction detail), debts, plans, accounts, and
settings, each reachable through persistent navigation that remains
available on every screen. The settings screen SHALL include the
household section (current household, members, invitations, home code,
leave) and the profile display-name editor. Anonymous and signed-in
users SHALL have the same screen set (the difference is
synchronization, not features).

#### Scenario: All screens reachable

- **WHEN** the user opens the navigation from any screen
- **THEN** entries for dashboard, transactions, analytics, debts, plans,
  accounts, and settings are available and navigate to their screens

#### Scenario: Screen set independent of authentication

- **WHEN** an anonymous user and a signed-in user compare their navigation
- **THEN** both see the same screen entries

#### Scenario: Household management from settings

- **WHEN** a signed-in user opens settings
- **THEN** the household section is present with the actions their role
  permits

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

### Requirement: Analytics screens

The web app SHALL provide the analytics overview screen and per-direction
detail screens satisfying the `analytics` capability requirements, with
web-native presentation (route-based detail navigation instead of mobile
screen pushes).

#### Scenario: Analytics overview on web

- **WHEN** the user opens the analytics screen for a month with expenses
  and income
- **THEN** the overview shows the direction summary cards with donut charts
  and legends per the analytics capability

#### Scenario: Detail screen by route

- **WHEN** the user selects a direction card (or opens the detail URL
  directly)
- **THEN** the per-direction detail screen opens with period selection and
  navigation per the analytics capability

### Requirement: Debts screens

The web app SHALL provide the debts screen satisfying the `debts`
capability: the two-direction list with summary cards, debtor history, debt
operation create/edit, and debtor creation — with web-native presentation
(dialogs instead of mobile bottom sheets).

#### Scenario: Debts list and history on web

- **WHEN** the user opens the debts screen and selects a debtor
- **THEN** the debtor's operation history and balance are shown, and the
  user can record or edit operations per the debts capability

### Requirement: Plans screens

The web app SHALL provide the plans screen satisfying the
`planned-payments` capability: the list of planned payments, plan
create/edit, and the confirm flow that generates a real transaction and
advances the plan.

#### Scenario: Confirm a planned payment on web

- **WHEN** the user confirms a due planned payment
- **THEN** a transaction is created from the plan and the plan advances to
  its next occurrence per the planned-payments capability

### Requirement: Quick income entry

The web app SHALL provide a quick income entry matching the mobile income
flow: create an income transaction with account and category selection in
a minimal number of steps.

#### Scenario: Record income

- **WHEN** the user uses the quick income entry and submits the form
- **THEN** an income transaction is created locally and appears in the
  cashflow data

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

### Requirement: Mobile parity principle

For the shared feature set, every domain action available in the mobile app
SHALL be available in the web app, with behavior governed by the same
capability specs; presentation and navigation idioms SHALL be web-native
(routes, links, dialogs) rather than imitations of mobile navigation.

#### Scenario: Parity of actions

- **WHEN** a domain action (create, edit, delete, confirm, resolve) is
  available for a shared feature on mobile
- **THEN** the equivalent action is available on the web screen for that
  feature

#### Scenario: Web-native navigation

- **WHEN** the user moves between screens or opens a detail view
- **THEN** navigation uses web routes (deep-linkable, back-button working)
  rather than modal-only flows
