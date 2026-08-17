# Mobile Forms Specification

## Purpose

Defines how user-input forms in the mobile app behave and are structured:
declarative form state, validation, error surfacing, money parsing, Bottom
Sheet composition, lifecycle, and testing. These requirements apply to forms
built on the adopted React Hook Form + Zod standard — new forms, and existing
forms when the change that next touches them migrates them. Forms not yet
migrated are out of scope until their migrating change.

## Requirements

### Requirement: Declarative form state for non-trivial forms

A non-trivial user-input form in `apps/mobile` — one with validation,
submission, multiple coordinated fields, or a meaningful form lifecycle —
SHALL manage its field values, validation, touched/dirty state, submit state,
and field/form-level errors through React Hook Form driven by a Zod schema
(`useForm` with `zodResolver`). Such a form SHALL NOT hand-roll form state as
independent `useState` hooks per field, error, or touched flag. Simple
ephemeral controls or isolated inputs that are not meaningfully a form (and
non-form UI state such as open/closed flags or view modes) MAY use local
React state.

Every non-trivial user-input form in `apps/mobile` SHALL conform to this
requirement — including the previously hand-rolled login, register,
account-creation, category-creation, and transaction-creation forms. No form
is exempt as "not yet migrated"; the migration grandfathering is retired.

#### Scenario: New non-trivial form is built on the standard stack

- **WHEN** a new form with validation or a submission flow is implemented in `apps/mobile`
- **THEN** its field values, validation, touched/dirty state, submit state, and field/form errors are owned by React Hook Form with a Zod schema, with no per-field/error/touched `useState` form state

#### Scenario: Legacy forms run on the standard stack

- **WHEN** the login, register, account-creation, category-creation, or transaction-creation form is exercised in `apps/mobile`
- **THEN** its field values, validation, touched/dirty state, submit state, and field/form errors are owned by React Hook Form with a Zod schema, with no per-field/error/touched `useState` form state and no aggregate error string standing in for per-field validation

#### Scenario: Simple controls stay local

- **WHEN** a screen has ephemeral UI state (a sheet open/closed flag, a view mode) or a simple isolated control that is not meaningfully a form (e.g. a search filter)
- **THEN** that state MAY remain plain local React state, independent of the form standard

### Requirement: Client validation gates submission and errors are visible

A form SHALL validate its values against its Zod schema on submit. While any
validated field is invalid, submission SHALL be blocked and the invalid field
SHALL show its validation message through the field's error affordance
(exposed to the accessibility tree as an alert). When all fields are valid,
submission SHALL proceed with the parsed, typed form values.

#### Scenario: Invalid input blocks submit and shows the field error

- **WHEN** the user submits a form with a field that fails its Zod validation
- **THEN** the submit handler is not invoked with the invalid values, and the failing field displays its validation message as an accessibility alert

#### Scenario: Valid input submits parsed values

- **WHEN** the user submits a form whose values satisfy the schema
- **THEN** the submit handler receives the schema-parsed form values

### Requirement: Server and repository errors surface by error code

When a submit-triggered repository or API call fails, the form SHALL surface
a human-readable message derived from the shared repository-error mapping
keyed on the machine error `code` (not the HTTP status), at form level or on
the affected field. The failure SHALL NOT crash the form, and entered field
values SHALL be preserved so the user can retry.

#### Scenario: Repository error is shown without losing input

- **WHEN** a submission fails with a `RepositoryError` carrying a machine `code`
- **THEN** the form displays the message mapped from that code and keeps the user's entered values for retry

### Requirement: No duplicate submission while pending

While a form's submission is pending, the submit control SHALL be disabled or
otherwise blocked so a second submission cannot be triggered.

#### Scenario: Double tap during pending submission

- **WHEN** the user taps the submit control again while the previous submission is still pending
- **THEN** no second submission is triggered

### Requirement: Money form fields parse to minor units

A form field that edits a monetary amount SHALL accept text in major units
(locale decimal separator allowed), validate it, and convert it to int64 minor
units (divisor 100) through the shared money parser when building the submit
payload. Monetary values SHALL NOT be persisted or submitted as floating
point.

#### Scenario: Major-units string becomes minor-units payload

- **WHEN** the user enters `100,50` into an amount field and submits
- **THEN** the submission payload carries the integer `10050` minor units

#### Scenario: Unparseable amount is rejected

- **WHEN** the user enters text that cannot be parsed as a monetary amount
- **THEN** validation blocks submission with a field-level message

### Requirement: Bottom Sheet forms separate container from form

A form rendered inside a Bottom Sheet SHALL be an independent form component
that owns its own form state and submission. The Bottom Sheet SHALL own only
presentation and lifecycle concerns (ref, snap points, dismissal, header,
layout). Text inputs inside a sheet SHALL use the sheet-aware input variant so
keyboard handling works and the fields remain exposed to the accessibility
tree. The form component SHALL NOT depend on being rendered inside a sheet.

#### Scenario: Form works identically inside and outside a sheet

- **WHEN** the same form component is rendered inside a Bottom Sheet and as a plain page section
- **THEN** its fields, validation, and submission behave identically, with no sheet-specific coupling in the form

#### Scenario: Sheet inputs stay keyboard- and accessibility-visible

- **WHEN** the user focuses a text input inside a Bottom Sheet form
- **THEN** the sheet handles the keyboard and the input is reachable in the accessibility tree (Maestro selectable by testID)

### Requirement: Deliberate form lifecycle and reset

A form's reset SHALL be explicit and tied to its flow lifecycle: returning to
default values after a successful submission, and re-initializing when the
flow restarts (e.g. a sheet reopening in a different mode). A form SHALL NOT
silently rely on incidental remounts or assume opening/closing a container
resets its state.

#### Scenario: Successful submit resets the form

- **WHEN** a submission succeeds and the flow starts over
- **THEN** the form returns to its default values explicitly

#### Scenario: Mode change re-initializes the form

- **WHEN** a sheet form is reopened for a different mode (e.g. expense vs. transfer)
- **THEN** the form is explicitly re-initialized with that mode's defaults

### Requirement: Form behavior is test-covered

Every form built on this standard SHALL have behavioral tests covering:
invalid input blocks
submission; valid input submits the expected values; validation and server
errors are visible; pending state prevents duplicate submission; and reset
behavior where the flow requires it. Tests SHALL assert observable behavior
(testIDs, rendered messages, submitted payloads) rather than internal form
state.

#### Scenario: Form test suite exercises the validation and submit paths

- **WHEN** a form's test suite runs
- **THEN** it demonstrates blocked submission on invalid input, submitted values on valid input, visible error surfacing, duplicate-submission prevention, and reset behavior, all asserted through observable output
