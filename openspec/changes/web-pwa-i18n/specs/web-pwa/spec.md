# Delta: web-pwa (new capability)

## Purpose

Installability, offline application shell, and update behavior of the web
app distributed as a Progressive Web App.

## ADDED Requirements

### Requirement: Installability

The web app SHALL provide a complete web app manifest (product name, icons
including maskable variants, standalone display, token-derived theme and
background colors) and SHALL be installable as a standalone app on browsers
supporting PWA installation.

#### Scenario: Install on a phone

- **WHEN** the user opens the app in a PWA-capable mobile browser and
  chooses to install it
- **THEN** the app installs with its name and icons and opens standalone
  without browser chrome

### Requirement: Offline application shell

After the app has been loaded once, it SHALL start without any network
connection: the shell, application code, worker code, and the WASM binary
SHALL be served from the service worker's precache, and the app SHALL
operate on local data per the `web-local-data` capability.

#### Scenario: Cold start offline

- **WHEN** the device has no connectivity and the user opens the installed
  app (or reloads the tab)
- **THEN** the application loads and works on local data without network
  access

### Requirement: No cached API responses

The service worker SHALL NOT serve cached backend API responses: network
requests to the API either reach the backend or fail, so the app never
displays stale server data. Offline behavior comes from local data, not
from HTTP caching.

#### Scenario: API traffic bypasses precache

- **WHEN** the service worker handles a request to an API endpoint
- **THEN** the request passes through to the network and no cached response
  is substituted

### Requirement: Prompted updates

When a new version of the app is published, the app SHALL detect it and
prompt the user; the new version SHALL activate after the user accepts
(reload) or when the app is next cold-started. The prompt SHALL NOT lose
unsaved user state by reloading without consent.

#### Scenario: Update available

- **WHEN** a new build is deployed and the running app fetches the updated
  worker
- **THEN** the user is offered a reload action and the app does not reload
  on its own while the user is working
