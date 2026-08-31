# web-screens Delta

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
household, members, invitations, home code, leave) and the profile
display-name editor. Anonymous and signed-in users SHALL have the same
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

## ADDED Requirements

### Requirement: Mobile navigation shell

On viewports narrower than 768px the web app SHALL present a mobile
navigation shell consisting of a persistent bottom tab bar and a central
floating action button. The tab bar SHALL offer exactly four primary
tabs — dashboard, plans, analytics, settings, in that order — split
around a central gap slot. Each tab SHALL navigate to its route
(deep-linkable, back-button working), and the active tab SHALL reflect
the current route. The FAB SHALL straddle the tab bar's top edge in the
central slot and, when activated, SHALL open a speed-dial offering three
actions — create expense, create transfer, create income — each opening
the existing creation flow for that kind; activating the FAB SHALL NOT
navigate or change the current screen. The shell SHALL respect safe-area
insets when displayed in standalone (PWA) mode. On viewports of 768px
and wider the shell SHALL NOT be displayed (the sidebar is used
instead).

#### Scenario: Tab navigates by route

- **WHEN** the user activates a tab in the bottom tab bar
- **THEN** the app navigates to that tab's route, the tab becomes active,
  and the screen is deep-linkable with a working back button

#### Scenario: Active tab follows the current route

- **WHEN** the user opens a detail route of a primary screen (for
  example, an analytics direction detail)
- **THEN** the tab of that primary screen is shown as active

#### Scenario: Speed-dial actions

- **WHEN** the user activates the FAB and picks one of the three
  speed-dial actions
- **THEN** the corresponding transaction creation flow (expense,
  transfer, or income) opens

#### Scenario: FAB does not navigate

- **WHEN** the user activates the FAB
- **THEN** the current screen remains displayed and no navigation occurs

#### Scenario: Shell absent on desktop widths

- **WHEN** the viewport is 768px or wider
- **THEN** the bottom tab bar, FAB, and mobile top bar are not displayed

### Requirement: Mobile top bar account access

On viewports narrower than 768px the web app SHALL present a slim
persistent top bar showing the app brand on the left and, on the right,
the synchronization status badge and the account access control. For a
signed-in user the account access control SHALL be an avatar menu
displaying the user's email and a sign-out action. For an anonymous user
the top bar SHALL instead show the guest-mode badge and a sign-in
action that navigates to the login screen. The synchronization and
guest-mode indicators SHALL each appear exactly once per viewport.

#### Scenario: Signed-in account menu

- **WHEN** a signed-in user opens the avatar menu in the mobile top bar
- **THEN** their email and a sign-out action are shown, and activating
  sign-out signs the user out

#### Scenario: Anonymous sign-in entry

- **WHEN** an anonymous user views the mobile top bar
- **THEN** the guest-mode badge and a sign-in action are shown, and
  activating sign-in navigates to the login screen

#### Scenario: Indicators are single-instance

- **WHEN** the user views any screen in the mobile shell
- **THEN** the synchronization status badge and the guest-mode indicator
  are each rendered exactly once
