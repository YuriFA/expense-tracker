# Mobile Forms Specification — delta

## MODIFIED Requirements

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
