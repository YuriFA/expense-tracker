# ADR-0001: Auth & CSRF threat model — one stateful cookie session, server-enforced Origin check for browser mutations

- **Status:** Accepted (2026-08-20)
- **Scope:** backend auth posture, web + mobile clients; no API contract change
- **Related:** `docs/architecture/invariants.md` #3; `docs/assumptions.md` (stale gate pruned)

## Context

One Go backend serves two clients: the Vue web app (same-origin `/api` via
the Vite dev proxy, browser) and the React Native app (native cookie store,
offline-first sync since 2026-08-17). Authentication is a stateful,
DB-backed session cookie (`session_id`; 256-bit token; sliding expiry;
revoke-on-password-reset) — invariant #3. There is no CSRF middleware
today; browser protection rests on three implicit layers: SameSite=Lax
cookies, JSON-only request bodies (spec validation), and the CORS
allowlist. These are browser mechanics — none of them apply to the native
client. `docs/assumptions.md` previously gated mobile-API integration on
an auth spec change; that gate was overtaken by the sync integration and
the posture was never recorded.

Threat-model split:

- **Browser CSRF** (cross-site state-changing requests riding the cookie)
  — in scope for explicit enforcement.
- **Native client:** CSRF is not its threat shape (no browser involved).
  Device-level risks (cookie-store compromise, malware, cleartext
  transport off-localhost) are acknowledged and **out of scope** for this
  ADR.

## Decision

1. **One auth mechanism.** The stateful session cookie remains the only
   authentication mechanism for both clients. No JWT, no bearer companion
   (invariant #3 unchanged).
2. **CSRF enforcement for browser mutations.** The backend enforces an
   explicit server-side **Origin check** on state-changing (non-GET)
   cookie-authenticated requests: when an `Origin` header is present it
   must match the configured allowlist, otherwise the request is rejected.
   Requests without `Origin` (native apps, CLI, tests) pass — browsers
   always send `Origin` on state-changing requests, so this discriminates
   browser traffic without breaking native clients. SameSite=Lax,
   JSON-only validation, and the CORS allowlist remain defense-in-depth
   layers, not the primary control.
3. **Native client.** Uses the same cookie session with no additional
   CSRF requirements.
4. **Transport policy.** Production: HTTPS only; session cookies always
   `Secure`. Development: plain HTTP on `localhost` is allowed and
   `Secure` may be disabled there (iOS will not send `Secure` cookies over
   plain HTTP — see the `session.secure` rationale in
   `backend/internal/config/config.go`).

## Options considered

- **Accept the three implicit layers** — rejected: no explicit
  server-side enforcement; posture undocumented.
- **Origin check (chosen)** — cheap, browser-accurate, invisible to the
  contract.
- **Double-submit CSRF tokens** — rejected: extra state and client
  plumbing in both apps, no additional native benefit.
- **Bearer-token companion for mobile** — rejected: violates invariant #3,
  adds a second auth path in backend and contract.

## Consequences

- `docs/architecture/invariants.md` #3 records the posture. The
  Origin-check middleware is **implemented** (2026-08-30, the
  `backend-hardening` change: `middleware/origin.go`, mounted pre-CORS in
  `server.go`, 403 `ORIGIN_REJECTED`; e2e `hardening_test.go`) — this line
  updated 2026-09-01 by the repo audit; the original record said
  "decided but not yet implemented; implementation is a separate work
  item".
- No OpenAPI contract change: the check is server-side enforcement of
  existing endpoints.
- The Origin allowlist shares configuration with CORS; the wildcard-CORS
  default (`config.go`, finding A6) becomes a correctness dependency of
  this control — explicit origins only.
- The stale gate in `docs/assumptions.md` ("needs a spec change before
  mobile touches the API") is pruned.
