## Context

Images are tagged `sha-<short>` (+`main`) by both deploy paths
(`.github/workflows/deploy.yml`, root `Makefile`); `/api/health` already
exists (unauthenticated liveness, `api-hardening` spec); the web app boots
through `main.ts`; Vite builds define-time constants natively; Go takes
linker-injected strings via `-ldflags -X`.

## Goals / Non-Goals

- Goals: one glance (browser console or `curl /api/health`) identifies the
  running build; front/back drift is visible.
- Non-Goals: semver/release tags, a version UI element, mobile surfaces,
  version in error reports or logs beyond the console line.

## Decisions

1. **The version string IS the image tag** (`sha-<short>`), not semver.
   It is already the deployment vocabulary (rollback pins it, compose
   shows it); inventing a second scheme adds nothing. Consumers compare
   strings for equality only.
2. **Injection via one `VERSION` build argument per image.**
   - API: `Dockerfile` `ARG VERSION=dev` →
     `-ldflags "-X main.version=$VERSION"`; a package-level `Version()`
     accessor keeps the wiring in `cmd` (testable, single injection site).
   - Web: `ARG VERSION=dev` → `ENV VITE_APP_VERSION` → Vite
     `define` (`__APP_VERSION__`), typed in `env.d.ts` / a tiny
     `shared/lib/app-version.ts` helper.
3. **Both deploy paths pass the same argument**: CI uses its computed
   `sha-<short>` output for both `build-arg`s; the Makefile uses
   `SHORT_SHA`. Drift between front and back versions becomes impossible
   by construction from one path (and a rollback redeploys both images
   from the same tag).
4. **Health is the transport**: `version` joins `status` in the payload
   (`Health` schema, required). No new endpoint, no auth change; ops
   (`curl https://<host>/api/health`) and the web boot log share one
   source of truth.
5. **Console output is one `console.info`** in `main.ts` after mount:
   `[expense-tracker] web sha-… · api sha-…`. The API part is a
   fire-and-forget `fetch('/api/health')`; failures (offline start) leave
   a web-only line — offline-first startup must not depend on the API.
   The fetch bypasses the API client (no session/base-URL semantics
   needed; relative URL hits the same origin through the gateway).

## Risks / Trade-offs

- [Version forgotten in a future deploy path → `dev` in prod] → the
  string itself is the tell: seeing `dev` on a deployed host is the
  alarm, not a silent absence.
- [Console log in production noise] → one line at boot is the accepted
  cost; it is the feature.

## Migration Plan

Purely additive; deploys as a normal image rollout. Old/new payloads
differ only by the extra field; no client parses health today.

## Open Questions

None.
