## MODIFIED Requirements

### Requirement: Bottom Sheet forms separate container from form

A form rendered inside a Bottom Sheet SHALL be an independent form component
that owns its own form state and submission. The Bottom Sheet SHALL own only
presentation and lifecycle concerns (ref, snap points, dismissal, header,
layout). Text inputs inside a sheet SHALL use the sheet-aware input variant so
keyboard handling works and the fields remain exposed to the accessibility
tree. The form component SHALL NOT depend on being rendered inside a sheet.

When sheets are stacked (a picker sheet presented over a form sheet), the
content of every sheet in the stack SHALL remain exposed to the accessibility
tree throughout the stack's lifecycle — including after background data-sync
activity and after a form sheet is reopened as a fresh mount. A sheet stack
SHALL NOT permanently remove its elements from the accessibility tree, and
recovery SHALL NOT require an app restart.

#### Scenario: Form works identically inside and outside a sheet

- **WHEN** the same form component is rendered inside a Bottom Sheet and as a plain page section
- **THEN** its fields, validation, and submission behave identically, with no sheet-specific coupling in the form

#### Scenario: Sheet inputs stay keyboard- and accessibility-visible

- **WHEN** the user focuses a text input inside a Bottom Sheet form
- **THEN** the sheet handles the keyboard and the input is reachable in the accessibility tree (Maestro selectable by testID)

#### Scenario: Sheet stack stays in the accessibility tree after create+sync

- **WHEN** a record created in a sheet form has synced, the form is later reopened as a fresh mount over the same screen, and a picker sheet cycle runs on top of it (open, select, close)
- **THEN** the form sheet and picker sheet elements remain reachable in the accessibility tree (VoiceOver and Maestro by testID) without restarting the app
