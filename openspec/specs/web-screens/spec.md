# web-screens Specification

## Purpose
The web app's screen inventory and navigation contract: which screens
exist, how users reach them, and the parity principle that every domain
action available on mobile for the shared feature set is available on the
web with web-native presentation.

## Requirements

### Requirement: Screen inventory

The web app SHALL provide screens for dashboard, transactions, analytics
(overview and per-direction detail), debts, plans, accounts, and settings,
each reachable through persistent navigation that remains available on
every screen. Anonymous and signed-in users SHALL have the same screen set
(the difference is synchronization, not features).

#### Scenario: All screens reachable

- **WHEN** the user opens the navigation from any screen
- **THEN** entries for dashboard, transactions, analytics, debts, plans,
  accounts, and settings are available and navigate to their screens

#### Scenario: Screen set independent of authentication

- **WHEN** an anonymous user and a signed-in user compare their navigation
- **THEN** both see the same screen entries

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
