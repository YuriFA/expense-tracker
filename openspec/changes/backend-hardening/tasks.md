## 1. Contract first

- [x] 1.1 Add `GET /api/health` to `docs/api/openapi.yaml` (unauthenticated,
      `200` `{status: "ok"}`); update `registerUser` description (rate
      limited per IP, every attempt counts) and align `loginUser` wording
- [x] 1.2 Regenerate and commit: `make gen` (backend) + `pnpm gen:api`
      (packages/api schema.ts); `make gen-check` and CI ts-gen drift gates
      green

## 2. Origin-check middleware (ADR-0001)

- [x] 2.1 Implement `transport/http/middleware/origin.go`: non-GET +
      `Origin` present + not an exact member of
      `http_server.cors.allowed_origins` → reject; wildcard `*` matches
      nothing and logs a startup warning; mount globally in `server.go`
- [x] 2.2 Map the rejection to 403 + machine code `ORIGIN_REJECTED` via
      the errormap (single mapping site, invariant #4)
- [x] 2.3 Unit tests: allowed origin passes, foreign origin 403 (state not
      changed), no-Origin passes, GET never blocked, wildcard config
      rejects-with-warning
- [x] 2.4 Docker-backed e2e: full happy-path suite still passes with the
      middleware mounted (header-less calls pass)

## 3. Registration rate limit

- [x] 3.1 Add the count-all-attempts limiter (sibling of
      `FailureRateLimiter`) and extend `pathAwareRateLimit` to mix limiter
      kinds per path; wire `POST /api/auth/register`
- [x] 3.2 Config: `register_rate_limit {max_attempts: 10,
      lockout_duration: 1h}` in local/prod yaml + env overrides, following
      the existing `failure_rate_limit` pattern
- [x] 3.3 Map rejection to the rate-limit error shape with code
      `REGISTER_RATE_LIMITED` (errormap)
- [x] 3.4 Unit/e2e tests: within-budget registrations succeed; over-budget
      attempt rejected with the code and creates no user; login and other
      endpoints unaffected from the same IP

## 4. Health endpoint

- [x] 4.1 Implement the `GET /api/health` handler (liveness-only: no
      session, no DB) against the generated server interface; unit test
      asserts unauthenticated 200 `{status:"ok"}`

## 5. Docs and gates

- [x] 5.1 Prune `docs/assumptions.md`: drop "Registration is not
      rate-limited"; mark the CSRF Origin-check decided-direction as
      implemented (cite this change); keep the single-replica entry
- [x] 5.2 Full backend gates: `go test -race ./...` (docker DB),
      `make gen-check`, lint; `openspec validate backend-hardening
      --strict`
