## MODIFIED Requirements

### Requirement: Home screen data behavior

The home screen SHALL derive entirely from local data: total expenses for
the selected month grouped by category, the full list of expenses for the
selected month, and three balance modes — month expenses, month balance
(income minus expenses, transfers excluded), and total balance across
accounts. The selected month SHALL be the device's local calendar month:
a transaction belongs to the selected month iff its occurred-at instant
falls within that calendar month in the device's local timezone, and this
attribution SHALL be consistent across every month-scoped figure the home
screen shows (category totals, expense lists, month expenses, month
balance). The category list SHALL start empty on a fresh install, and a
category SHALL be created with a name, a type, an icon chosen from a
predefined list, and a circle background color chosen from a predefined
list.

#### Scenario: Month totals without connectivity

- **WHEN** the user opens the home screen offline after recording expenses in the selected month
- **THEN** per-category totals, the expense list, and all three balance modes are rendered from local data

#### Scenario: Transaction at a month boundary

- **WHEN** a transaction occurs at 00:30 local time on the first day of a month
- **THEN** it is attributed to the new month in every month-scoped figure on the home screen and to neither figure of the previous month

#### Scenario: Fresh install category list

- **WHEN** the app is freshly installed and the user opens the category creation sheet
- **THEN** the category list is empty and a new category can be created by choosing a name, type, icon, and color from the predefined lists
