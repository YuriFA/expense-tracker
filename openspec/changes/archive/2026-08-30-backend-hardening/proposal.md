## Why

The backend is about to be exposed to the public internet (roadmap stage 6:
VPS deploy + open registration). Two decided-but-unimplemented protections
must land before that: the CSRF Origin check (ADR-0001, accepted 2026-08-20)
and a rate limit on registration (an explicit TODO in the OpenAPI spec —
only login/verify-email are limited today). Deployment healthchecks also
need a health endpoint.

## What Changes

- Server-side Origin check on state-changing (non-GET) requests, exactly as
  decided in ADR-0001: a request carrying an `Origin` header outside the
  configured allowlist is rejected; requests without `Origin` (native
  clients, tests) pass.
- Registration endpoint (`POST /api/auth/register`) gains a per-client-IP
  rate limit, counted on **every attempt** (account creation is the abuse,
  not the failure) — unlike the existing failure-based login limiter.
- New unauthenticated liveness endpoint `GET /api/health`; the only OpenAPI
  contract change in this change.
- OpenAPI: `registerUser` description drops the "not rate-limited (TODO)"
  note and documents the limit; `make gen` + `pnpm gen:api` regenerated.
- `docs/assumptions.md`: prune the "Registration is not rate-limited" entry;
  the CSRF Origin-check decided-direction entry moves from pending to done
  (cites this change).

## Capabilities

### New Capabilities
- `api-hardening`: transport-level protections and operational endpoints of
  the HTTP API — CSRF Origin enforcement, per-endpoint rate limits, health.

### Modified Capabilities

None. Login/verify-email limiting already exists (OpenAPI descriptions);
registration limiting is net-new behavior under `api-hardening`.

## Impact

- **Backend**: new middleware (Origin check), `pathAwareRateLimit` extension
  for count-all-attempts limiters, new health handler; config reuses the
  CORS `allowed_origins` allowlist (per ADR-0001) and the existing
  `failure_rate_limit`-style knobs for the register limiter.
- **Contract**: `docs/api/openapi.yaml` — add `/api/health`, update
  `registerUser` description; regenerate `api.gen.go` + `schema.ts`.
- **Clients**: no code changes — the Origin check is invisible to the web
  app (same-origin) and native apps (no `Origin`); the health endpoint is
  infra-only.
- **Tests**: backend unit/e2e for the middleware and the register limiter;
  docker-backed e2e unaffected (no `Origin` header).
