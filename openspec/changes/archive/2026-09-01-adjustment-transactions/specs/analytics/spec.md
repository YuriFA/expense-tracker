## ADDED Requirements

### Requirement: Adjustment transactions are excluded from direction figures

Adjustment transactions SHALL be excluded from every income and expense
figure the analytics capability computes: direction totals, per-category
totals and percentages, and donut compositions, on the overview cards and
the detail screens alike. An adjustment is neither income nor expense; it
corrects a balance without representing a money-flow event. Adjustment
transactions SHALL nonetheless remain visible in period-scoped transaction
listings (subject to the transaction type filter).

#### Scenario: Adjustments excluded from overview cards

- **WHEN** the current month contains expenses of 5000, income of 3000, and an adjustment of -2000 on one of the accounts
- **THEN** the overview cards show an expenses total of 5000 and an income total of 3000, and the adjustment contributes to neither

#### Scenario: Adjustments excluded from category breakdown

- **WHEN** the selected period contains expenses of 20113 in «Такси» and an adjustment of -2000
- **THEN** the breakdown shows the direction total of 20113 with «Такси» at 100%, and the adjustment appears in no category row and no total

#### Scenario: Adjustment visible in the period's transaction listing

- **WHEN** the user opens a period-scoped transaction listing that includes an adjustment transaction
- **THEN** the listing shows the adjustment with its signed amount and no category
