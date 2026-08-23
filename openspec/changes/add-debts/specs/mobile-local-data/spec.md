## ADDED Requirements

### Requirement: Debts screen data behavior

The debts screen SHALL derive entirely from local data: the two direction
totals («Мне должны» / «Я должен»), the per-debtor balances, and the
operation history SHALL be computed from the local debtors and debt
operations via the local repository. Balances SHALL follow the debts
capability's derivation (per-debtor per-direction sums, no netting across
directions). Creating, editing, and deleting debtors and debt operations
SHALL be available offline through the local repository and SHALL converge
via sync. The screen SHALL be reachable via an enabled «Долги» quick action
on the home screen, which replaces the «Цели» action; the goals placeholder
screen SHALL be removed. Debtors whose balance is zero in a direction SHALL
be hidden from that direction's section by default behind an explicit
reveal affordance, and visible debtors SHALL be sorted by balance
descending. The screen SHALL NOT offer period switching (debts are not
month-scoped) and SHALL NOT include an all-operations card.

#### Scenario: Debt figures without connectivity

- **WHEN** the user opens the debts screen offline after recording debtors and operations
- **THEN** both direction totals and every debtor row render from local data, and recording a new operation works without connectivity

#### Scenario: Sections split by direction

- **WHEN** Анна owes the user 5 000,00 ₽ and the user owes Сергей 2 000,00 ₽
- **THEN** Анна appears only in «Мне должны» with 5 000,00 ₽, Сергей only in «Я должен» with 2 000,00 ₽, and the summary shows both totals separately

#### Scenario: Fully repaid debtor is hidden until revealed

- **WHEN** a debtor's balance in a direction reaches zero through a repayment
- **THEN** the debtor disappears from that section, and a reveal affordance shows the count of hidden (settled) debtors and lists them on demand

#### Scenario: Quick action opens the debts screen

- **WHEN** the user taps the «Долги» quick action on the home screen
- **THEN** the debts screen opens showing the two direction totals and the two debtor sections

#### Scenario: Debtor history sheet

- **WHEN** the user taps a debtor row
- **THEN** a sheet opens showing the debtor's remaining balance in that direction and the day-grouped operation history labeled by kind («Долг» / «Списание»), with a «Новое списание» action that creates a repayment for that debtor and direction

#### Scenario: Operation form

- **WHEN** the user records a debt operation
- **THEN** the form offers a Долг ↔ Списание kind switch, a debtor picker and a direction choice (both pre-fixed when the form is opened from a debtor's sheet), a positive amount entered as digits, a date, and an optional note

#### Scenario: Over-repayment is warned, not blocked

- **WHEN** the user records a repayment larger than the debtor's remaining balance in that direction
- **THEN** the form shows a warning but accepts the operation, and the resulting balance reflects the over-repayment

#### Scenario: Debtor deletion guard works offline

- **WHEN** the user deletes a debtor that has live (non-deleted) debt operations in the local repository
- **THEN** the deletion is rejected locally with a debtor-in-use error

#### Scenario: Debtor with only deleted operations is deletable offline

- **WHEN** every debt operation of a debtor has been deleted locally (tombstoned) and the user deletes the debtor
- **THEN** the deletion succeeds offline and later synchronizes as a tombstone, matching the debts capability's deletion rules
