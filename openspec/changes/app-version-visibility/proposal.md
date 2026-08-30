## Why

The product is deployed (two deploy paths, sha-tagged images) but nothing
in the running system says which build it is. Debugging "is the site on
the right version?" (which happened on the very first deploy) requires SSH
and `docker compose ps`. A version visible at runtime — in the browser
console and in the health endpoint — answers it instantly and exposes
front/back mismatches after partial rollbacks.

## What Changes

- Both deploy paths (CI and `make deploy`) pass a `VERSION` build argument
  equal to the image tag (`sha-<short>`); local/test builds fall back to
  `dev`.
- Backend: the version is injected via `-ldflags` into the binary and
  reported by `GET /api/health` alongside `status` (only OpenAPI change:
  the `Health` schema gains `version`).
- Web: the version is baked in at Vite build time; at startup the app logs
  one console line with its own build version and, via a fire-and-forget
  `/api/health` fetch, the API's version.

## Capabilities

### New Capabilities
- `app-version`: runtime build identification — how running components
  report which build they are (API health payload, web boot console line).

### Modified Capabilities
- `api-hardening`: the Health endpoint requirement gains the `version`
  field in its response.

## Impact

- **Contract**: `docs/api/openapi.yaml` — `Health.version` (required
  string); regenerate `api.gen.go` + `schema.ts`.
- **Backend**: `Dockerfile` ARG + ldflags, version variable in
  `cmd/…/main.go`, health handler includes it.
- **Web**: `Dockerfile` ARG → `VITE_APP_VERSION`, `vite.config` define,
  one `console.info` at startup in `main.ts` (+ health fetch).
- **Deploy**: `deploy.yml` and root `Makefile` pass `--build-arg
  VERSION=…` to both image builds (same value as the tag).
- **Non-goals**: no UI element (console only; a settings-page badge can
  come later), no mobile version surface, no semver tagging scheme.
