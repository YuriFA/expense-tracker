## Purpose

Theme behavior of the web app: the user-controlled appearance setting (light, dark, or
following the OS preference), its per-browser persistence, live OS-preference following,
and flash-free application at startup.

## ADDED Requirements

### Requirement: Theme setting in settings

The web settings screen SHALL offer an appearance setting with the values light, dark,
and system, with light as the default for a user who has never chosen a theme. The
selected theme SHALL apply to the entire interface immediately, without a page reload.

#### Scenario: Default appearance

- **WHEN** a user who has never changed the theme opens the app
- **THEN** the interface renders in the light theme and the settings appearance control shows light as selected

#### Scenario: Switching to dark

- **WHEN** the user selects dark in the settings appearance control
- **THEN** the interface switches to the dark theme immediately, without a page reload

### Requirement: Theme persistence

The chosen theme SHALL persist per browser across sessions and SHALL NOT be synchronized
to the backend or shared with other browsers.

#### Scenario: Choice persists across sessions

- **WHEN** the user selects dark and later opens the app in a new session in the same browser
- **THEN** the interface renders in the dark theme

### Requirement: System theme following

In system mode the interface SHALL render according to the OS color-scheme preference and
SHALL follow changes to that preference live, without a reload. In light and dark modes
the OS preference SHALL have no effect on rendering.

#### Scenario: OS preference changes while in system mode

- **WHEN** the app is in system mode and the OS color scheme changes to dark
- **THEN** the interface switches to the dark theme without a reload

#### Scenario: Explicit choice overrides the OS preference

- **WHEN** the app is in light mode and the OS color scheme is, or becomes, dark
- **THEN** the interface keeps rendering in the light theme

### Requirement: Startup application without a flash

On startup the persisted theme SHALL be applied before the first render, so the user does
not see the wrong theme flash before the stored choice takes effect.

#### Scenario: Returning dark-theme user

- **WHEN** a user with dark stored as the theme loads the app
- **THEN** the first painted screen is already in the dark theme
