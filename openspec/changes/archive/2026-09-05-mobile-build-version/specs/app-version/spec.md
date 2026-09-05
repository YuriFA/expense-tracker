## ADDED Requirements

### Requirement: Mobile logs its build version

The mobile app SHALL resolve its build version from the embedded Expo
manifest (the app manifest's `version`), falling back to the native
application version and then to `dev` when neither is available. On
startup it SHALL log its own build version to the console, and SHALL
additionally fetch the API's version from `/api/health` and include it in
the same output when reachable. When the API is unreachable, the app
SHALL still log its own version and start normally.

#### Scenario: Console line shows both versions

- **WHEN** the app starts and the API is reachable
- **THEN** one console line reports the mobile build version and the API build version

#### Scenario: Offline start logs the mobile version only

- **WHEN** the app starts while the API is unreachable
- **THEN** the console reports the mobile build version and startup proceeds without error

#### Scenario: Manifest-less runtime falls back

- **WHEN** the app runs without an embedded manifest or native version
- **THEN** the startup line reports `dev`
