## Purpose

Defines the product's currency policy: both apps present money exclusively
in rubles (account creation fixed to RUB, currency-less aggregates
displayed in RUB) while the API contract remains multi-currency-ready, so
a future multi-currency change extends the product rather than reworking
it.

## ADDED Requirements

### Requirement: Ruble-only account creation in the apps

The web and mobile apps SHALL create accounts only in RUB. The account
creation forms SHALL NOT offer a currency choice and SHALL submit RUB as
the account currency without user action.

#### Scenario: New account in the web app

- **WHEN** the user creates an account in the web app, providing a name and an opening balance
- **THEN** the created account has currency RUB and no currency picker was shown

#### Scenario: New account in the mobile app

- **WHEN** the user creates an account in the mobile app, providing a name and an opening balance
- **THEN** the created account has currency RUB and no currency picker was shown

### Requirement: Currency-less aggregates display in rubles

Amounts that carry no currency of their own - debts and debt operations,
planned payments, analytics totals - SHALL be formatted in RUB in both
apps. The web settings screen SHALL NOT offer a currency setting.

#### Scenario: Debts summary

- **WHEN** the user views the debts screen
- **THEN** every debt amount is formatted as rubles

#### Scenario: Analytics totals

- **WHEN** the user views the analytics overview
- **THEN** the totals are formatted as rubles

#### Scenario: Settings screen has no currency option

- **WHEN** the user opens the web settings screen
- **THEN** no currency selector is offered

### Requirement: Default currency is rubles across apps

The shared money package SHALL define RUB as the default currency used by
both apps as the single display-currency source.

#### Scenario: Fresh install

- **WHEN** a user opens either app with no prior local state
- **THEN** money that carries no account currency (aggregates, empty-state figures) is formatted in rubles
