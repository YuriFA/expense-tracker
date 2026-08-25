## ADDED Requirements

### Requirement: Plans screen data behavior

The plans screen SHALL derive entirely from local data: the per-type plan
counts, the normalized monthly totals, the plan lists, and overdue
detection SHALL be computed from the local planned payments via the
local repository. The normalized monthly total of a type SHALL convert
each live plan's amount to a monthly figure (monthly as-is; yearly
divided by 12; weekly multiplied by 52/12; daily multiplied by 365/12)
and sum the results. The screen SHALL present two cards — «Расходы»
(Подписки, платежи по кредитам и прочее) and «Доходы» (Зарплата, премии
и прочее) — each showing its live plan count and normalized monthly
total. Tapping a card SHALL open a sheet with that type's live plans as
a flat list sorted by next-due ascending (overdue plans come first,
badged as overdue); each row SHALL show the plan's name or, when
unnamed, its category's name, the amount, a regularity label, and the
next-due date, and the sheet SHALL carry a bottom «Добавить
расход/доход» action above the bottom safe area. Tapping a row SHALL open an edit sheet with the
same form plus deletion. The add/edit form SHALL fix the plan's type
from the card and offer a positive amount entered as digits with the
selected account's currency shown beside the input, an optional name,
a required account («Счёт списания» for expenses, «Счёт зачисления»
for incomes), a required type-matched category, a next-due date
chosen from a calendar (past dates allowed), a regularity choice
(день / неделя / месяц / год), a confirmation-mode choice (ручное /
авто), a reminder choice (выкл / за день / в день), and an optional
note. The form SHALL render the account, category, date, regularity,
confirmation-mode, reminder, and note fields as one-line rows with the
label on the left and the current value on the right; tapping a row
SHALL open that field's picker sheet (the note row SHALL focus its
input), and the sheet content SHALL keep bottom safe-area padding. Creating, editing, and deleting plans SHALL be available offline
through the local repository and SHALL converge via sync; deleting an
account or category referenced by live local plans SHALL be rejected
locally with the corresponding in-use error. Manually confirming a plan
SHALL open a confirm sheet with an editable amount (defaulting to the
plan's amount, shown with the account's currency), an editable date
(defaulting to the occurrence's scheduled date), and an optional note,
with the account and category fixed as context; the confirm sheet
SHALL use the same one-line row layout and safe-area bottom padding as
the add/edit form; submitting SHALL create the transaction and advance
the plan in one local transaction, per the planned-payments capability's
manual-confirmation rules. The screen SHALL replace the «Планы» tab
placeholder and SHALL NOT touch the home screen or analytics.

#### Scenario: Plans figures without connectivity

- **WHEN** the user opens the plans screen offline after creating plans
- **THEN** both cards show their counts and monthly totals from local data, and creating a new plan works without connectivity

#### Scenario: Monthly normalization

- **WHEN** the user has an expense plan of 599,00 ₽ monthly and another of 6 000,00 ₽ yearly
- **THEN** the «Расходы» card shows 2 plans totaling 1 099,00 ₽/мес

#### Scenario: Overdue plans sort first

- **WHEN** one expense plan is overdue and another is due next month
- **THEN** the overdue plan is listed first with an overdue badge, ahead of the future one

#### Scenario: Unnamed plan row shows its category

- **WHEN** a plan has no name and references category "Развлечения"
- **THEN** its row title is the category name "Развлечения"

#### Scenario: Confirm sheet adjusts the amount

- **WHEN** the user opens the confirm sheet for a 2 400,00 ₽ utilities plan and submits with the amount changed to 2 650,00 ₽
- **THEN** a 2 650,00 ₽ transaction is created locally, the plan advances one period, and both later converge via sync

#### Scenario: Local in-use guard

- **WHEN** the user deletes an account that a live local plan references
- **THEN** the deletion is rejected locally with an account-in-use error

### Requirement: Planned payment reminders

The mobile app SHALL schedule local notifications for plans whose
reminder setting is not `off`: a `day_before` reminder fires the day
before the occurrence's scheduled date and an `on_day` reminder fires on
it, both at 10:00 device-local time. Reminders SHALL be rescheduled from
the current live local plans whenever plans change locally or a sync
pull delivers plan changes; a deleted plan (locally or via pull) SHALL
have its pending reminders canceled, and no reminder SHALL be scheduled
for a date already in the past. Reminder copy SHALL reflect the
confirmation mode — an `auto` plan's reminder announces the upcoming
charge, a `manual` plan's reminder prompts the user to confirm it.
Notification permission SHALL be requested when the user first enables a
reminder; when permission is denied, reminders silently do not fire
while the setting is stored and synced. Reminders are scheduled
independently on each device from its local data — there is no server
push.

#### Scenario: Reminder fires the day before

- **WHEN** a manual plan with reminder `day_before` is due on September 5 and the app is closed
- **THEN** the device shows a local notification on September 4 at 10:00 local time prompting the user to confirm the payment

#### Scenario: Denied permission degrades silently

- **WHEN** the user declines notification permission and keeps a plan with reminders enabled
- **THEN** no notification fires, the app keeps working, and the reminder setting is stored and synced like any other field

#### Scenario: Editing a plan moves its reminder

- **WHEN** the user changes a plan's next-due date from the 5th to the 20th
- **THEN** the pending reminder is rescheduled to match the new date

#### Scenario: Deleting a plan cancels its reminder

- **WHEN** the user deletes a plan that has a pending reminder
- **THEN** the reminder is canceled and never fires

#### Scenario: A pulled plan gets a reminder on the second device

- **WHEN** a plan with reminders enabled is created on one device and synchronized to another
- **THEN** the second device schedules its own local reminder from the pulled data
