## MODIFIED Requirements

### Requirement: Screen inventory

The web app SHALL provide screens for dashboard, transactions, analytics
(overview and per-direction detail), debts, plans, accounts, and
settings. The full screen set SHALL be reachable on every viewport:
on viewports 768px and wider through a persistent sidebar listing all
entries, and on viewports narrower than 768px through the mobile
navigation shell (persistent bottom tab bar for the primary screens
dashboard, plans, analytics, and settings; transactions, debts, and
accounts reachable from the dashboard screen, which is always one tap
away). The settings screen SHALL include the household section (current
household, members, invitations, home code, leave), the profile
display-name editor, a category management section reachable at
`/settings/categories`, and a data section reachable at `/settings/data`
with CSV import and full CSV export of transactions. Anonymous and
signed-in users SHALL have the same screen set (the difference is
synchronization, not features).

#### Scenario: All screens reachable

- **WHEN** the user opens the navigation from any screen
- **THEN** entries for the primary screens are persistently available
  (sidebar on viewports of 768px and wider, bottom tab bar below 768px)
  and navigate to their screens, and the remaining screens
  (transactions, debts, accounts) are reachable via the sidebar or the
  dashboard links per the viewport

#### Scenario: All screens reachable on phone widths

- **WHEN** the user is on any screen at a viewport narrower than 768px
- **THEN** the bottom tab bar offers dashboard, plans, analytics, and
  settings, and the transactions, debts, and accounts screens remain
  reachable via links on the dashboard screen

#### Scenario: Screen set independent of authentication

- **WHEN** an anonymous user and a signed-in user compare their navigation
- **THEN** both see the same screen entries

#### Scenario: Household management from settings

- **WHEN** a signed-in user opens settings
- **THEN** the household section is present with the actions their role
  permits

#### Scenario: Category management from settings

- **WHEN** the user opens the settings screen
- **THEN** a categories section leads to the category management screen at `/settings/categories`

#### Scenario: Data section from settings

- **WHEN** the user opens the settings screen
- **THEN** a data section leads to the data screen at `/settings/data` offering CSV import and full CSV export

## ADDED Requirements

### Requirement: Transactions screen export action

The transactions screen header SHALL offer an export action that downloads
a CSV of exactly the transactions matching the active screen filters
(account multi-select including «Без счета», type, date range), through
the shared CSV export feature. The action SHALL reflect the filtered set
at the moment of activation.

#### Scenario: Export honors the active filters

- **WHEN** the user activates the export action with filters applied
- **THEN** the downloaded CSV contains only the transactions matching those filters

#### Scenario: Export with no filters

- **WHEN** the user activates the export action with no filters applied
- **THEN** the downloaded CSV contains every non-deleted transaction
