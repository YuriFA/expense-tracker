# Delta: web-locales (new capability)

## Purpose

Locale behavior of the web app at launch: Russian as the default language,
English fully available, and user-controlled switching with persistence.

## ADDED Requirements

### Requirement: Russian default

A first-time visitor with no stored locale choice SHALL get the Russian
locale regardless of browser language settings.

#### Scenario: First visit

- **WHEN** a user opens the app for the first time
- **THEN** the UI is presented in Russian

### Requirement: Complete English coverage

Every user-visible string of the web app SHALL exist in both Russian and
English message catalogs; a missing key SHALL fail the i18n lint gate, not
render a raw key to the user.

#### Scenario: Switching to English

- **WHEN** the user switches the locale to English
- **THEN** all UI text across all screens renders in English with no
  untranslated keys or mixed-language screens

### Requirement: Locale switching and persistence

The app SHALL offer a locale switcher (Russian/English) in settings; the
chosen locale SHALL persist across sessions and apply immediately without a
reload.

#### Scenario: Choice persists

- **WHEN** the user selects English and later returns in a new session
- **THEN** the UI is in English

#### Scenario: Immediate effect

- **WHEN** the user switches the locale
- **THEN** the interface language changes immediately without requiring a
  page reload
