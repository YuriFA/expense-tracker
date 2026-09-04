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
category SHALL be created with a name, a type, and an icon chosen from
the predefined emoji list of that type; the circle background color SHALL
be auto-assigned from the icon's pre-paired color and SHALL NOT be
user-chosen.

#### Scenario: Month totals without connectivity

- **WHEN** the user opens the home screen offline after recording expenses in the selected month
- **THEN** per-category totals, the expense list, and all three balance modes are rendered from local data

#### Scenario: Transaction at a month boundary

- **WHEN** a transaction occurs at 00:30 local time on the first day of a month
- **THEN** it is attributed to the new month in every month-scoped figure on the home screen and to neither figure of the previous month

#### Scenario: Fresh install category list

- **WHEN** the app is freshly installed and the user opens the category creation sheet
- **THEN** the category list is empty and a new category can be created by choosing a name, type, and icon from the predefined list, with the color auto-assigned from the icon

#### Scenario: Category icon created on the web app

- **WHEN** a category created on the web app with an emoji icon is synced to the device
- **THEN** the category renders its emoji icon and pre-paired color like a locally created category

#### Scenario: Legacy Ionicons icon from an earlier mobile version

- **WHEN** a category created by an earlier mobile version stores an Ionicons glyph name as its icon
- **THEN** the device displays a mapped emoji icon instead of a blank glyph, without rewriting the stored value
