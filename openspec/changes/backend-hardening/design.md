## Context

ADR-0001 decided the server-side Origin check (unimplemented work item);
login/verify-email already run behind the in-memory `FailureRateLimiter`
wired per-path in `transport/http/server.go` (single-replica assumption,
`docs/assumptions.md`); registration is unlimited (OpenAPI TODO). Config
already carries `http_server.cors.allowed_origins` and `trusted_proxies`;
`local.yaml` allowlists `http://localhost:5173/5174` (the Vite dev proxy
origin), `prod.yaml` sets `secure: true` with explicit origins.

## Goals / Non-Goals

- Goals: land ADR-0001's primary CSRF control; close the registration
  abuse surface; give the deployment a liveness probe.
- Non-Goals: distributed rate limiting (single replica stays the accepted
  constraint); changing CORS mechanics; double-submit tokens or any client
  change; email verification enforcement.

## Decisions

1. **Origin check is one global middleware, not per-route groups.** ADR-0001
   scopes it to "all non-GET cookie-authenticated traffic" — in practice
   every non-GET route (unauthenticated ones gain nothing from exemptions
   and per-route lists leak). Implemented in
   `transport/http/middleware/origin.go`, mounted after
   request-id/logger, before routing: if method != GET and `Origin` is
   present and not an exact member of `cors.allowed_origins` → reject.
   Implementation note: it mounts BEFORE the CORS middleware (which moved
   after the logger) — gin-contrib/cors pre-empts disallowed origins with
   a bare 403, which would hide the `ORIGIN_REJECTED` machine code.
   Alternative: exempt auth endpoints — rejected: registration/login are
   the juiciest CSRF targets for cookie-less attacks and the rule is
   cheaper to reason about uniform.
2. **Exact-match allowlist, no wildcard semantics.** `*` in the allowlist
   matches nothing and logs a startup warning (ADR-0001 finding A6 makes
   explicit origins a correctness dependency — fail closed, visibly).
3. **Rejection shape**: HTTP 403 with a new machine code `ORIGIN_REJECTED`
   (invariant #4; additive — clients fall back to generic handling for unknown
   codes). Implementation note: written directly via `httperr.Write` with the
   code constant in `httperr` — the errormap (`writeDomainError`) is driven by
   the strict-handler `HandlerErrorFunc` and is unreachable from middleware;
   direct-write is the established pattern (RateLimit, AuthRequired,
   Idempotency).
4. **Register limiter counts every attempt, not failures.** Account
   creation is the abuse; a "failure-based" counter would never trip.
   Extend the middleware family with a sibling of `FailureRateLimiter`
   that counts all requests, and extend `pathAwareRateLimit` to mix both
   kinds per path. New config block `register_rate_limit:
   {max_attempts: 10, lockout_duration: 1h}` (env-overridable like the
   login block). Rejection reuses the existing rate-limit error shape
   with code `REGISTER_RATE_LIMITED`. Alternatives: per-account global
   quota (no — punishes families), proxy-level limiting (deferred with
   the single-replica assumption).
5. **Health is liveness-only**: `GET /api/health` → `200 {status:"ok"}`,
   no session, no DB touch, no business logic. Compose/K8s need
   "process serving"; the DB has its own `pg_isready` healthcheck and
   `depends_on` gates startup. A readiness variant with a DB ping was
   considered and rejected — it would bounce the API on DB blips that
   the local-first clients tolerate by design.
6. **Contract**: `/api/health` added to `docs/api/openapi.yaml`;
   `registerUser`/`loginUser` descriptions state their limits uniformly.
   Regenerate `api.gen.go` (`make gen`) and `schema.ts` (`pnpm gen:api`).

## Risks / Trade-offs

- [Shared NAT exhausts the register budget (10/h per IP)] → acceptable for
  a family-scale launch; budget is config/env-tunable without code.
- [Origin allowlist drift between deploys (new domain not listed)] →
  deploy-vps runbook lists the env var next to the domain; failure mode is
  loud (all web mutations 403), not silent.
- [Proxy strips/trusts the wrong hops → limiter sees the proxy IP] →
  `SetTrustedProxies` already wired; deploy-vps pins it to the gateway
  network.
- [Native clients send no `Origin` → unaffected] → verified by existing
  e2e (docker, header-less) plus new unit tests with the header.

## Migration Plan

No data migration. Deploy order: ensure the production allowlist contains
the web origin (deploy-vps concern), then roll the new image. Rollback =
previous image; no persisted state introduced (limiters are in-memory).

## Open Questions

None — limiter defaults (10/h) can be retuned via config later without
spec or code-shape changes.

## Deviations during implementation

- **Wildcard origins panic at startup, not warn-only.** D2 said "matches
  nothing and logs a startup warning"; the shipped server refuses to boot
  on wildcard/empty entries (`server.go` panics before the engine is built),
  and the middleware keeps the defensive warn-and-skip. Fail closed at boot
  beats fail closed per-request — a misconfigured prod origin allowlist is
  caught by the deploy, not by the first user.
- **Origin check mounts before CORS** (CORS moved one slot down): the CORS
  middleware pre-empts disallowed origins with a bare 403 that would hide
  the `ORIGIN_REJECTED` machine code. Side effect: a foreign-origin GET
  through the full engine still gets CORS's bare 403 — pre-existing
  behavior, untouched; the spec's GET scenario is scoped to the Origin
  check accordingly.
- **Rejection codes live in `httperr`, written directly** (`httperr.Write`),
  not in the errormap: `writeDomainError` is driven by the strict-handler
  error callback and is unreachable from middleware — the established
  pattern for RateLimit/AuthRequired/Idempotency. Same uniform error
  shape, centralized code constants.
