## ADDED Requirements

### Requirement: Income screen data behavior

The income screen SHALL derive entirely from local data and scope every
figure to income: the summary figure SHALL be the income total for the
selected month (the home screen's balance modes are not offered), the
income list SHALL cover the month's incomes grouped by day, and the
category breakdown SHALL show per-category income totals for the month.
Expenses and transfers SHALL be excluded from every figure on this screen,
and only income-type categories SHALL appear in its category breakdown. The
selected month SHALL follow the same attribution as the home screen: the
device's local calendar month, consistent across every month-scoped figure,
navigable to previous and next months. The screen SHALL be reachable via an
enabled «Доходы» quick action on the home screen, and category creation
started from the income screen SHALL default to the income type (the type
choice remains available).

#### Scenario: Income totals without connectivity

- **WHEN** the user opens the income screen offline after recording incomes in the selected month
- **THEN** the month income total, the day-grouped income list, and the per-category income totals are rendered from local data

#### Scenario: Expenses and transfers are excluded

- **WHEN** the selected month contains expenses and transfers alongside incomes
- **THEN** no figure on the income screen includes them — the summary total, the income list, and every category total count income transactions only

#### Scenario: Transaction at a month boundary

- **WHEN** an income occurs at 00:30 local time on the first day of a month
- **THEN** it is attributed to the new month in every month-scoped figure on the income screen and to neither figure of the previous month

#### Scenario: Month navigation rescopes every figure

- **WHEN** the user navigates to the previous or next month on the income screen
- **THEN** the summary total, the income list, and the category breakdown all re-scope to the newly selected month

#### Scenario: Income categories only

- **WHEN** the user opens the income screen and expense-type categories exist
- **THEN** the category breakdown lists only income-type categories, and a category created from the income screen defaults to the income type

#### Scenario: Quick action opens the income screen

- **WHEN** the user taps the «Доходы» quick action on the home screen
- **THEN** the income screen opens showing the selected month's income total
