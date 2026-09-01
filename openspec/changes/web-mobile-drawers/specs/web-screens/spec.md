# web-screens Delta

## MODIFIED Requirements

### Requirement: Debts screens

The web app SHALL provide the debts screen satisfying the `debts`
capability: the two-direction list with summary cards, debtor history, debt
operation create/edit, and debtor creation. The overlay surfaces of the
screen (debtor form, debtor history, debt operation form) SHALL follow the
Mobile overlay presentation requirement: a bottom-sheet drawer on viewports
narrower than 768px and a centered dialog on viewports of 768px and wider.

#### Scenario: Debts list and history on web

- **WHEN** the user opens the debts screen and selects a debtor
- **THEN** the debtor's operation history and balance are shown, and the
  user can record or edit operations per the debts capability

### Requirement: Mobile parity principle

For the shared feature set, every domain action available in the mobile app
SHALL be available in the web app, with behavior governed by the same
capability specs. Navigation idioms SHALL be web-native (routes, links)
rather than imitations of mobile navigation. Presentation of modal overlay
surfaces SHALL be viewport-aware per the Mobile overlay presentation
requirement: on viewports narrower than 768px they use the mobile
bottom-sheet drawer idiom; on viewports of 768px and wider they use centered
dialogs.

#### Scenario: Parity of actions

- **WHEN** a domain action (create, edit, delete, confirm, resolve) is
  available for a shared feature on mobile
- **THEN** the equivalent action is available on the web screen for that
  feature

#### Scenario: Web-native navigation

- **WHEN** the user moves between screens or opens a detail view
- **THEN** navigation uses web routes (deep-linkable, back-button working)
  rather than modal-only flows

#### Scenario: Viewport-aware overlay presentation

- **WHEN** the same overlay surface (for example, debtor history) is opened
  on a phone viewport and on a desktop viewport
- **THEN** it is presented as a bottom-sheet drawer on the phone and as a
  centered dialog on the desktop

## ADDED Requirements

### Requirement: Mobile overlay presentation

On viewports narrower than 768px, the modal overlay surfaces of the shared
feature set — creation and edit forms, detail and history lists, and the
transactions filter panel — SHALL be presented as bottom-sheet drawers
anchored to the bottom edge, dismissible by swipe-down and by a close
affordance. On viewports of 768px and wider the same surfaces SHALL be
presented as centered dialogs. Destructive-confirmation dialogs SHALL remain
centered dialogs at every viewport. Inside a form drawer, the account,
category, and date picker rows SHALL open a picker drawer stacked above the
form drawer, and each picker SHALL change only its own field. While a stack
of drawers is open, the content of every drawer in the stack SHALL remain
exposed to the accessibility tree. Where another requirement names a dialog
or a modal without a viewport qualifier, its presentation SHALL follow this
requirement.

#### Scenario: Form opens as a drawer on a phone

- **WHEN** the user opens a creation or edit overlay at a viewport narrower
  than 768px
- **THEN** it is presented as a bottom-sheet drawer, and swipe-down or the
  close affordance dismisses it

#### Scenario: Centered dialog on desktop widths

- **WHEN** the same overlay is opened at a viewport of 768px or wider
- **THEN** it is presented as a centered dialog

#### Scenario: Destructive confirms stay centered

- **WHEN** a delete, leave, dissolve, or remove confirmation opens at a
  phone viewport
- **THEN** it is presented as a centered dialog, not a bottom-sheet drawer

#### Scenario: Picker opens stacked above the form

- **WHEN** the user activates the account, category, or date picker row
  inside a form drawer
- **THEN** a picker drawer opens stacked above the form drawer and only
  that field changes

#### Scenario: Drawer stack stays accessible

- **WHEN** a picker drawer is open above a form drawer
- **THEN** the content of both drawers remains exposed to the accessibility
  tree

#### Scenario: Filters open as a drawer on a phone

- **WHEN** the user opens the transactions filters at a viewport narrower
  than 768px
- **THEN** the filter panel is presented as a bottom-sheet drawer; at 768px
  and wider the side panel remains
