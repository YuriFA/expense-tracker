# Mobile build version surface

## Why

The app-version capability made runtime build identification real for the
API (health payload) and the web app (startup console line with both
versions), but the mobile app exposed no runtime version surface at all
(`package.json` stuck at `0.0.0`, nothing logged) - an operator looking at
a device could not tell which build it runs, and mobile/api version drift
was invisible. Finding B9 (rev.3 audit), decided: add the surface now.

## What Changes

- The mobile app resolves its build version from the embedded Expo
  manifest (`app.json` `version`, frozen into the bundle - Expo Go, dev
  clients, and store builds all read the same field); a manifest-less
  runtime falls back to the native application version, then `dev`.
- On startup the app logs one console line with its own version and,
  when the API is reachable, the API's `/api/health` version in the same
  output - mirroring the web requirement. Offline start logs the
  mobile-only line and never blocks boot.
- The API health fetch bypasses the API client (no session semantics);
  the base URL is the existing `EXPO_PUBLIC_API_URL` binding.

## Capabilities

### Modified Capabilities

- `app-version`: gains the mobile startup requirement (same shape as the
  web one).
