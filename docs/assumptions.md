# Assumptions & Open Decisions

The facts-vs-assumptions rule: only behavior confirmed by code or by
authoritative documentation (OpenAPI spec, `AGENTS.md`) is established.
Everything below is NOT decided yet — do not treat it as implemented,
do not build on it as if it were a requirement, and do not invent the
missing behavior. When one of these becomes real work, record the
decision in the OpenSpec change that implements it and prune it here.

- **Multi-currency aggregation is undefined; target model is decided.**
  The API has no exchange rates and its balances endpoint sums across
  currencies as-is. Product direction (decided for the mobile Home
  screen, `docs/product/mobile-home.md`): v1 assumes the user's
  accounts are in a single currency; the intended model is conversion
  into a primary currency once an exchange-rate subsystem exists
  (future work, unbuilt).
- **Auth/CSRF posture decided** — see `docs/adr/0001-auth-csrf-threat-model.md`
  (2026-08-20): one stateful cookie session for both clients; server-side
  Origin check on state-changing browser requests; production HTTPS-only,
  dev HTTP-on-localhost allowed. The Origin-check middleware itself is
  still an unimplemented work item.
- **Deployment is single-replica** (decided 2026-08-20). The backend runs
  as one replica, which makes the in-memory per-IP rate limiter
  (`middleware/ratelimit.go`) sufficient. Revisit (distributed or
  proxy-level limiting) before ever scaling horizontally.
- **Decided-direction items pending implementation** (2026-08-20):
  (a) web migrates onto `@expense-tracker/dates` as the canonical date
  layer (its app-local `@internationalized/date` adapter is temporary;
  extend the package when web needs more); (b) tokens: the mobile palette
  is canonical — the web CSS copy syncs to it (light background/border,
  popover↔aliceblue, radius) plus a guard test; (c) `i18n`
  `DEFAULT_LOCALE` changes en→ru (product default locale RU; `dates`
  already 'ru').
- **Mobile package adoption is expected, not wired.** Mobile is meant
  to consume `@expense-tracker/{api,money,i18n}` (see
  `apps/mobile/AGENTS.md` "Not yet built"), but none are integrated
  yet — only `tokens` is used today.
- **Email delivery provider is unchosen.** The backend mailer is a
  logging stub; verification/reset emails go nowhere.
- **Registration is not rate-limited** — an explicit TODO in the
  OpenAPI spec itself (`registerUser` description); only login and
  verify-email are rate-limited today.
- **OAuth (Google/VK/Yandex)** is planned (`docs/PLAN.md`); the mobile
  login screen shows social buttons with no handlers.
- **Roadmap tail** — observability, deployment/ops, background jobs,
  performance, architecture experiments are `READY`/`PARTIAL`/`THINKING`
  in `docs/roadmap/`, not built.
