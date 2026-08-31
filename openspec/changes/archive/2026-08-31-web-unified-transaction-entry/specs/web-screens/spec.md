# web-screens Delta

## MODIFIED Requirements

### Requirement: Dashboard screen

The web dashboard SHALL show a month-scoped overview composed of: summary stat cards for
the total balance across accounts, the period's income, the period's expenses, and the
net debt position (total receivable minus total payable); a breakdown of the period's
expenses by category; and the period's most recent transactions. It SHALL additionally
show period-independent snapshots — the accounts with their balances and the debtor
balances by direction. The dashboard SHALL NOT carry inline transaction-creation entry
points (quick actions); creation happens through the entry points defined by the
Transaction creation entry points requirement and, below 768px, the Mobile navigation
shell requirement. Month-scoped figures SHALL
attribute transactions to periods per the `analytics` capability, and money figures
SHALL be formatted per the `app-currency` capability.

#### Scenario: Overview of the current month

- **WHEN** the user opens the dashboard in a month with income and expenses
- **THEN** the income and expense stat cards, the category breakdown, and the recent transactions list show that month's figures

#### Scenario: Snapshot figures are not month-scoped

- **WHEN** the user switches the dashboard month
- **THEN** the accounts total and balances and the debtor balances remain unchanged

#### Scenario: Quick actions

- **WHEN** the user views the dashboard looking for quick add actions
- **THEN** none are shown, and transaction creation is reachable only
  through the shell entry points (sidebar CTA, hotkey «N», command palette,
  transactions-screen button on desktop; FAB speed-dial below 768px)

### Requirement: Quick income entry

The web app SHALL provide an income creation entry matching the mobile income
flow parity: creating an income transaction with account and category
selection in a minimal number of steps. The entry SHALL be the unified
transaction creation flow defined by the Transaction creation entry points
requirement (the income tab, or an income action in the command palette);
the dashboard SHALL NOT provide a dedicated income shortcut.

#### Scenario: Record income

- **WHEN** the user opens the unified creation flow with income preselected
  (income tab, command palette income action, or FAB speed-dial income tile
  below 768px) and submits the form
- **THEN** an income transaction is created locally and appears in the
  cashflow data

### Requirement: Transaction occurrence date at creation

The web forms for creating a transaction — expense, income, and transfer,
reached through any transaction creation entry point — SHALL offer a day-level
occurrence date choice that defaults to the moment the form was opened and
allows selecting any day, past or future. Changing the selected day SHALL
preserve the clock time captured when the form was opened, and the created
transaction's occurred-at SHALL carry the chosen day with that time.

#### Scenario: Back-dating an expense

- **WHEN** the user creates an expense with the occurrence date set to an earlier day
- **THEN** the created transaction occurs on the chosen day and appears under that date in history

#### Scenario: Untouched date defaults to now

- **WHEN** the user submits a creation form without changing the date
- **THEN** the transaction's occurred-at is the moment the form was opened

## ADDED Requirements

### Requirement: Transaction creation entry points

On viewports 768px and wider the web app SHALL provide a single unified
transaction creation flow — one creation form with expense, income, and
transfer tabs, presented as a centered modal (web-native presentation) — and
every desktop entry point SHALL open exactly that flow. The entry points
SHALL be: the persistent sidebar CTA with the localized label «Добавить
операцию» (the primary path, visually emphasized as the sidebar's main
action), a keyboard shortcut «N» that is ignored while the user is typing in
a text field, a command palette opened with ⌘K / Ctrl+K offering add actions
(create expense, create income, create transfer, new category) as an
accelerator, and a contextual create button on the transactions screen. The
command palette and the hotkey SHALL be accelerators; the sidebar CTA SHALL
remain sufficient on its own. On viewports narrower than 768px the entry
point SHALL be the FAB speed-dial per the Mobile navigation shell
requirement, which is unchanged by this requirement.

#### Scenario: Sidebar CTA opens the unified flow

- **WHEN** the user activates the sidebar CTA «Добавить операцию» at a
  desktop viewport
- **THEN** the unified creation flow opens as a centered modal with
  expense, income, and transfer tabs, without navigating away from the
  current screen

#### Scenario: Hotkey opens the unified flow

- **WHEN** the user presses «N» on any screen at a desktop viewport while not
  typing in a text field
- **THEN** the unified creation flow opens exactly as when the sidebar CTA is
  used, and pressing the key inside a text field types the character instead

#### Scenario: Command palette offers creation actions

- **WHEN** the user opens the command palette and activates an add action
  (create expense, create income, or create transfer)
- **THEN** the unified creation flow opens with the matching tab preselected,
  and a new-category action opens the existing category creation flow

#### Scenario: Contextual trigger on the transactions screen

- **WHEN** the user activates the create button on the transactions screen
- **THEN** the same unified creation flow opens

#### Scenario: Single flow across triggers

- **WHEN** the user adds a transaction from any desktop entry point
- **THEN** the created transaction is persisted through the same creation
  form and appears in the transaction data regardless of which entry point
  was used
