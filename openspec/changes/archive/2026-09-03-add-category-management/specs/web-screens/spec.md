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
display-name editor, and a category management section reachable at
`/settings/categories`. Anonymous and signed-in users SHALL have the same
screen set (the difference is synchronization, not features).

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

## ADDED Requirements

### Requirement: Category management screen

The category management screen at `/settings/categories` SHALL list the
household's non-deleted categories grouped by type (expense, income),
each row showing the category's icon, color, name, and its transaction
count computed from the local data, with actions to edit, archive
(unarchive for archived ones), and delete. Archived categories SHALL be
shown in a separate collapsible archive section of the same screen. The
edit dialog SHALL allow changing the name, icon, and color only - the
type SHALL NOT be editable. Creating categories from this screen SHALL
NOT be offered (creation stays in the transaction form dialog).

#### Scenario: Browse categories

- **WHEN** the user opens `/settings/categories`
- **THEN** active categories are listed grouped by type with icon, color, name, and transaction count, and the archive section is available

#### Scenario: Edit a category

- **WHEN** the user edits a category from the list
- **THEN** a dialog offers name, icon, and color; the type is shown read-only

#### Scenario: Archived section

- **WHEN** archived categories exist
- **THEN** the archive section lists them with an unarchive action, and they are absent from the active groups

### Requirement: Category deletion dialog

The delete flow SHALL branch by the category's references. A category
with no transactions and no live planned payments SHALL be deleted after
a plain confirmation. A category with transactions but no live planned
payments SHALL be offered a choice: archive (the default) or cascaded
delete; the cascaded option SHALL state the number of transactions to be
deleted and that account balances will change, and SHALL require typing
the category's exact name to confirm. An archived category with
transactions SHALL go directly to the cascaded-delete confirmation
(without the archive option). A category referenced by a live planned
payment SHALL NOT be deletable; the dialog SHALL explain the blocking
plans.

#### Scenario: Delete an unused category

- **WHEN** the user deletes a category with no transactions and no live plans
- **THEN** a plain confirmation deletes the category

#### Scenario: Delete a category with transactions

- **WHEN** the user deletes a category referenced by 12 transactions and no live plans
- **THEN** the dialog offers archiving as the default and cascaded delete as the alternative, stating the 12 transactions and the balance impact

#### Scenario: Typed confirmation for cascaded delete

- **WHEN** the user chooses the cascaded delete of a category with transactions
- **THEN** the destructive action stays disabled until the category's exact name is typed

#### Scenario: Delete blocked by a live plan

- **WHEN** the user attempts to delete a category referenced by a live planned payment
- **THEN** the dialog reports the block instead of offering deletion
