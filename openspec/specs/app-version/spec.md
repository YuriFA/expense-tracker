# app-version Specification

## Purpose

Runtime build identification: how running components report which build
they are, so an operator can see the deployed version without server
access and detect front/back version drift.

## Requirements

### Requirement: API reports its build version

The API SHALL carry a build version string, set from the image build
(`sha-<short>` tag of the deployed commit), and report it in the health
payload. Builds made without the version argument (local runs, tests)
SHALL report `dev`.

#### Scenario: Deployed build reports its commit

- **WHEN** a binary built with the image's version argument serves
  `GET /api/health`
- **THEN** the response carries that version string alongside the status

#### Scenario: Unversioned build reports dev

- **WHEN** the API runs from a plain `go run`/test build with no version
  argument
- **THEN** the health payload reports `dev`

### Requirement: Web logs build versions at startup

On startup the web app SHALL log its own build version to the browser
console, and SHALL additionally fetch the API's version from
`/api/health` and include it in the same console output when reachable.
When the API is unreachable, the app SHALL still log its own version and
otherwise start normally.

#### Scenario: Console line shows both versions

- **WHEN** the app starts and the API is reachable
- **THEN** one console line reports the web build version and the API
  build version

#### Scenario: Offline start logs the web version only

- **WHEN** the app starts while the API is unreachable
- **THEN** the console reports the web build version and startup proceeds
  without error
