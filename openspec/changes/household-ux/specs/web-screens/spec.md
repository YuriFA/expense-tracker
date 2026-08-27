# Delta: web-screens (household section in settings)

## MODIFIED Requirements

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
