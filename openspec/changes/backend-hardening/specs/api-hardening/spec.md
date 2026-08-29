## Purpose

Transport-level protections and operational endpoints of the HTTP API:
server-side CSRF Origin enforcement for browser mutations, per-endpoint rate
limits on authentication abuse surfaces, and a liveness endpoint for
deployment healthchecks.

## ADDED Requirements

### Requirement: CSRF Origin enforcement on state-changing requests

The server SHALL reject any non-GET request whose `Origin` header is present
and does not exactly match an origin in the configured allowlist (shared
with CORS), with an error response carrying a machine `code`. Requests
without an `Origin` header SHALL be processed normally (native clients,
tests). The check applies to every non-GET route, authenticated or not.

#### Scenario: Allowed origin passes

- **WHEN** a state-changing request carries `Origin: https://app.example.com`
  and that origin is in the allowlist
- **THEN** the request is processed exactly as without the check

#### Scenario: Foreign origin is rejected

- **WHEN** a state-changing request carries `Origin: https://evil.example.net`
  which is not in the allowlist
- **THEN** the server responds with an error carrying a machine `code` and
  does not perform the requested state change

#### Scenario: No Origin header passes

- **WHEN** a state-changing request carries no `Origin` header (native
  mobile client, CLI, test call)
- **THEN** the request is processed normally

#### Scenario: GET requests are never blocked by the Origin check

- **WHEN** a GET request carries a foreign `Origin`
- **THEN** the request is processed normally (the check covers non-GET only)

### Requirement: Registration rate limit

Registration attempts SHALL be rate-limited per client IP, counted on every
attempt (successful or not), with a configurable attempt budget and lockout
window. When the budget is exceeded, further registration attempts from that
IP SHALL be rejected with a rate-limit error until the window passes. The
limit SHALL NOT affect any other endpoint. Client IP resolution SHALL honor
the configured trusted-proxy policy (as login does today).

#### Scenario: Attempts within budget register normally

- **WHEN** a client IP performs registrations up to the configured attempt
  budget
- **THEN** each registration is processed normally

#### Scenario: Budget exceeded rejects further attempts

- **WHEN** a client IP has exhausted its registration attempt budget and
  performs another registration attempt
- **THEN** the server rejects it with a rate-limit error carrying a machine
  `code`, and no user is created

#### Scenario: Other endpoints are unaffected

- **WHEN** a client IP has exhausted its registration budget
- **THEN** requests to login and all non-registration endpoints are
  processed under their own (or no) limits

### Requirement: Health endpoint

The API SHALL expose `GET /api/health`, unauthenticated, returning success
when the process is serving requests. It SHALL NOT require a session,
execute business logic, or touch household-scoped data. The response SHALL
carry a machine-readable status.

#### Scenario: Unauthenticated liveness probe succeeds

- **WHEN** any client sends `GET /api/health` with no session cookie
- **THEN** the server responds with success and a machine-readable
  `status: ok` payload
