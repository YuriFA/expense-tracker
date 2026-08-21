# Assumptions & Open Decisions

Two different kinds of entries live here, kept strictly separate:

- **Assumption** — what we currently rely on that is not backed by a decided
  target architecture; implementation undefined. Do not treat it as
  implemented, do not build on it as if it were a requirement, and do not
  invent the missing behavior.
- **Decided direction (implementation pending)** — accepted target
  architecture whose implementation has not landed. The decision itself is
  recorded either in a cited canonical doc (ADR / invariant / spec) or in
  the entry itself, where the entry is explicitly marked as the canonical
  record; this file also tracks that it is pending. When one becomes real
  work, record it in the OpenSpec change that implements it and prune it
  here. If a decided direction grows cross-cutting or its rationale needs
  preserving, promote it to an ADR — this file must not become a second
  ADR system.

Only behavior confirmed by code or by authoritative documentation (OpenAPI
spec, ADRs, invariants, openspec specs) is established.

## Assumptions

- **Multi-currency aggregation is undefined; target model is decided.**
  The API has no exchange rates and its balances endpoint sums across
  currencies as-is. Product direction (decided for the mobile Home
  screen, `docs/product/mobile-home.md`): v1 assumes the user's
  accounts are in a single currency; the intended model is conversion
  into a primary currency once an exchange-rate subsystem exists
  (future work, unbuilt).
- **Deployment is single-replica** (accepted constraint, decided
  2026-08-20). The backend runs as one replica, which makes the in-memory
  per-IP rate limiter (`middleware/ratelimit.go`) sufficient. Revisit
  (distributed or proxy-level limiting) before ever scaling horizontally.
- **Email delivery provider is unchosen.** The backend mailer is a
  logging stub; verification/reset emails go nowhere.
- **Registration is not rate-limited** — an explicit TODO in the
  OpenAPI spec itself (`registerUser` description); only login and
  verify-email are rate-limited today.
- **OAuth (Google/VK/Yandex)** is planned.

## Decided directions (implementation pending)

- **CSRF Origin-check middleware** — decided in
  `docs/adr/0001-auth-csrf-threat-model.md`; the server-side Origin check
  on state-changing browser requests is the primary CSRF control and is
  still an unimplemented work item (until then: SameSite/JSON/CORS only).
- **Web migrates onto `@expense-tracker/dates`** as the canonical date
  layer — decided 2026-08-20; the app-local `@internationalized/date`
  adapter is the sanctioned temporary exception (invariant #14). Extend
  the package when web needs more; don't grow a permanent parallel adapter.
- **`i18n` `DEFAULT_LOCALE` changes en→ru** (product default locale RU)
  — decided 2026-08-20; `dates` already defaults to 'ru'. This entry is
  the canonical record of the decision.
- **Mobile i18n wiring** — react-i18next over the shared
  `@expense-tracker/i18n` bundle with mobile-local wiring (mobile already
  consumes api/dates/money/tokens); RU strings stay hardcoded with
  `TODO(i18n)` markers until the wiring lands. This entry is the
  canonical record of the decision.
