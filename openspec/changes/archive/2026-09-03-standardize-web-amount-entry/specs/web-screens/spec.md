## ADDED Requirements

### Requirement: Canonical web amount-entry behavior

Every web form control that edits money in major units SHALL use one shared
amount-entry interaction contract across the accounts, transactions,
reconciliation, debts, and plans screens. Positive-only flows SHALL reject
negative entry; flows that already require a signed monetary value SHALL
accept a leading `-` and expose that signed value directly.

While the field is focused, it SHALL present a raw numeric draft rather than
an editable currency-formatted string. The currency SHALL remain visible as a
non-editable cue associated with the field so the user can still tell which
currency is being edited. Keyboard-driven focus SHALL support immediate full-
value replacement, while pointer placement SHALL still allow in-place edits.

When the field loses focus with a valid value, it SHALL render the locale-
aware money display for that currency. The field SHALL accept common pasted or
manually entered formats that express the same amount, including `.` or `,`
as the decimal separator, optional grouping spaces, and pasted currency
symbols. The editable value SHALL still be constrained to two fractional
places. If the user leaves an invalid partial draft, the field SHALL restore
the last valid numeric value; if the user cleared the field, it SHALL remain
empty.

When a surrounding selector changes the active currency after an amount has
already been entered, the field SHALL keep the numeric value and update only
its currency cue and blurred formatting.

#### Scenario: Focused draft and blurred money formatting

- **WHEN** the user focuses a prefilled positive amount field such as opening
  balance, transaction amount, debt amount, plan amount, or reconcile balance
- **THEN** the focused field shows an editable numeric draft without an
  editable currency symbol, and blurring it renders the locale-aware money
  string for the same numeric value

#### Scenario: Keyboard focus enables quick replacement

- **WHEN** the user reaches a prefilled amount field through keyboard
  navigation and starts typing a new amount
- **THEN** the existing numeric value is replaced directly without requiring
  manual deletion of a currency symbol or a forced caret move to the end

#### Scenario: Formatted money paste is accepted

- **WHEN** the user pastes a formatted money string such as `1 234,56 ₽` or
  `$1,234.56` into a compatible amount field
- **THEN** the field keeps the equivalent numeric value, constrains it to two
  fractional digits, and blurs back to the locale-aware formatted money
  display

#### Scenario: Signed adjustment edit remains direct

- **WHEN** the user edits an existing adjustment transaction with a negative
  signed value such as `-4.50`
- **THEN** the adjustment edit form accepts that signed draft directly,
  preserves the sign through submission, and updates the account balance from
  the edited signed amount

#### Scenario: Currency changes do not clear the numeric value

- **WHEN** a transaction or reconcile form already contains an entered amount
  and the user changes the selected account so the active currency changes
- **THEN** the numeric amount remains entered, and only the currency cue and
  blurred money formatting switch to the newly selected currency
