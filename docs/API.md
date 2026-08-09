# API Reference

The canonical API contract is the OpenAPI 3.0.3 spec:

- **[`api/openapi.yaml`](./api/openapi.yaml)** - the single source of truth for
  every endpoint, request/response schema, status code, and error code.
- **View it:** run the server and open `/docs` (Redoc), or preview without a
  server with `npx @redocly/cli preview-docs docs/api/openapi.yaml`.
- **Drift guard:** `make gen` regenerates the Go server from the spec; CI runs
  `make gen-check` + Redocly lint + `oasdiff` breaking-change detection.

This file does **not** restate the spec. It captures only the policy decisions
that are hard to express in a machine-readable schema.

## Conventions

- Base path `/api`; `Content-Type: application/json` for all request bodies.
- **Money** is `integer (int64)` minor units (divisor 100). `$12.50 -> 1250`.
  Never float/decimal.
- **Timestamps** are ISO 8601 (`2026-07-13T10:30:00Z`), UTC everywhere.
- **IDs** are UUID v4 strings.

## Auth (stateful sessions, NOT JWT)

Auth is session-cookie based. The session id is a server-stored 256-bit token;
the server validates it on every request.

- **Session lifecycle:** every `register`/`login` mints a **fresh** `session_id`
  (session-fixation defense). Existing sessions are NOT revoked - multi-session
  is supported (web + mobile in parallel). `logout` revokes only the current
  session (idempotent). Sliding expiration extends a session when < 25% of the
  TTL remains. A successful password reset revokes **all** of the user's
  sessions. User deletion cascades to sessions at the schema level.
- **401 is unified:** "no cookie" and "expired/invalid session" return the same
  `UNAUTHORIZED`; we never reveal which.
- **`INVALID_CREDENTIALS` is unified:** bad email and bad password return the
  same error (anti-enumeration). `password-reset/request` always returns `204`
  regardless of whether the email exists.

## Rate limiting & trusted proxies

`POST /api/auth/login` and `POST /api/auth/verify-email` are failure-rate-limited
per **ClientIP**: after `max_attempts` failures (401/403) within the lockout
window, the IP is blocked with `429` + `Retry-After`; a success resets the
counter. The limiter keys on `ClientIP`, which comes from the TCP `RemoteAddr`
**unless** `trusted_proxies` is configured - by default `X-Forwarded-For` /
`X-Real-IP` are ignored to prevent IP spoofing and lockout abuse
(GHSA-9g5q-2w5x-hmxf). Behind a known proxy/CDN, configure `trusted_proxies`.

## Error nuances

- **`ACCOUNT_NOT_FOUND` 404 vs 422:** fetching an account by id returns `404`;
  an account referenced as a foreign key inside a `POST/PATCH /transactions`
  returns `422` (same code, distinct context). Same for `CATEGORY_NOT_FOUND`.
- **409 variants:** `USER_ALREADY_EXISTS`, `CATEGORY_ALREADY_EXISTS`,
  `TRANSACTION_VERSION_CONFLICT`, `ACCOUNT_IN_USE`, `CATEGORY_IN_USE`,
  `EMAIL_ALREADY_VERIFIED` - clients should switch on `code`, not just status.

## Idempotency (`POST /api/transactions`)

Send an `Idempotency-Key` header. A repeat with the same key **and** the same
body replays the original response; a repeat with the same key **and** a
different body returns `409 IDEMPOTENCY_KEY_MISMATCH`. A second request while
the first is still in flight returns `409 IDEMPOTENCY_KEY_IN_USE`. Keys expire
after 24h.

## Optimistic concurrency (`PATCH /api/transactions/{id}`)

`TransactionUpdateRequest.version` is required. Send back the `version` you read;
if the row was modified concurrently the server returns `409
TRANSACTION_VERSION_CONFLICT` (refetch and retry).
