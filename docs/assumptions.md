# Assumptions & Open Decisions

The facts-vs-assumptions rule: only behavior confirmed by code or by
authoritative documentation (OpenAPI spec, `AGENTS.md`) is established.
Everything below is NOT decided yet — do not treat it as implemented,
do not build on it as if it were a requirement, and do not invent the
missing behavior. When one of these becomes real work, record the
decision in the OpenSpec change that implements it and prune it here.

- **Mobile auth is undesigned.** How the RN client stores the session
  cookie is open, and the backend's CSRF posture (SameSite=Lax + CORS
  allowlist) does not protect a native client. Needs a spec change
  before mobile touches the API.
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
