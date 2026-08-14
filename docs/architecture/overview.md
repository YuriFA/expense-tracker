# Architecture Overview

High-level map of how the pieces fit together, for humans. Coding rules,
commands, and testing conventions live in the `AGENTS.md` files (root +
per area) and are not repeated here. Open decisions live in
`docs/assumptions.md`; known problems in `docs/technical-debt.md`.

## The contract-first graph

```
docs/api/openapi.yaml ── source of truth for the HTTP API contract; change FIRST
   ├─→ backend         oapi-codegen → api.gen.go (make gen; CI drift gate)
   └─→ packages/api    openapi-typescript → schema.ts (pnpm gen:api)

packages:  money (leaf) ← api ←─ web (uses all 4 packages)
           i18n  (leaf) ←────────┘
           tokens (leaf) ←──────── web + mobile (tokens only)

web    ── /api proxy, cookie session_id ──→ backend
mobile ── no backend integration yet ──→ backend
```

One Go backend serves two clients of the same product: the web app
(production-complete, uses the API today) and the mobile app (UI shell,
integration pending).

## Backend

Go (Gin + sqlc + PostgreSQL). Strict `transport → service → repository`
layering with compile-time interface checks; request validation is driven
by the OpenAPI spec itself (kin-openapi middleware); every domain error
is mapped to `{code, message}` in one place. Auth is a stateful session
cookie (`session_id`); the mailer is a logging stub. Details:
`backend/AGENTS.md`.

## Shared packages (`packages/`)

Platform-agnostic TypeScript consumed by both apps, resolved to source
`.ts` (no build step). Only fetch-family APIs are allowed — no DOM/Vue/
RN imports.

- **`api`** (deps: `money`) — the contract layer: the generated schema,
  `createApiClient({ baseUrl, fetch })`, error mapping keyed on the
  machine `code`, and the `Repository<T,C,U>` DI seam that apps
  implement. Apps supply the base URL; the package never imports app
  code.
- **`money`** (leaf) — dinero.js integer money over int64 minor units;
  its balance calculator is generic over a minimal account shape.
- **`i18n`** (leaf) — EN/RU message bundles; category-name mapping takes
  an injected translator, so it couples to neither Vue nor React.
- **`tokens`** (leaf) — design tokens exported as CSS (web, oklch) and
  RN styles (hex).

## Web (`apps/web/`)

Vue 3 + Vite, Feature-Sliced Design. Repositories are injected via
provide/inject behind the `api` package's interfaces (HTTP by default,
dev-only localStorage variant). A global unauthorized handler turns any
401 into a redirect to login. Auth is deliberately NOT behind the
repository seam — `entities/session` calls the API client directly.
Details: `apps/web/AGENTS.md`.

## Mobile (`apps/mobile/`)

React Native + Expo (FSD with an Expo Router adaptation: `src/app/` is
routes-only). Currently a UI/navigation shell: consumes only
`@expense-tracker/tokens`; data, auth, i18n, and money integration are
pending. Details: `apps/mobile/AGENTS.md`.
