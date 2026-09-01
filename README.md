# expense-tracker

Expense Tracker is a household budget app: a family shares one budget space —
accounts, categories, transactions, debts, and planned payments are common to
every member from the moment they join (ADR-0002). Free of subscriptions and
third-party aggregators: the family's data lives on its own server.

The product is a monorepo: a Go API, a Vue 3 web client (installable PWA),
and a React Native (Expo) mobile client, tied together by an OpenAPI contract.

## Structure

```
backend/      Go API (Gin + sqlc + Postgres)
apps/web/     Vue 3 + Vite (Feature-Sliced Design)
apps/mobile/  React Native + Expo (FSD + Expo Router, offline-first)
packages/     shared TS: api, dates, money, i18n; css: tokens
docs/api/     OpenAPI contract (source of truth)
```

Start with `AGENTS.md` (root + per area) for working rules,
`docs/architecture/` for the architecture baseline (overview, invariants,
findings), and `openspec/` for specs and changes.

The Go backend and the JS workspaces (`apps/*`, `packages/*`) are
independent toolchains. `pnpm install` only manages the JS side; it
ignores `backend/`.

## Prerequisites

- Go 1.26+
- pnpm 10+ (JS workspaces)
- Docker (Postgres for local runs; required for Go integration/e2e tests)

## Backend

```bash
cd backend
cp .env.example .env       # CONFIG_PATH + DATABASE_URL (local Postgres)
make dev                   # go run ./cmd/expense-tracker-api
make test                  # go test -race ./... (repo/e2e need Docker)
```

API runs on `http://localhost:8080`. Bring up Postgres with
`docker compose up db`.

## Frontend

```bash
pnpm install               # from repo root (installs all workspaces)
cd apps/web
pnpm dev                   # Vite dev server on :5173 (proxies /api to :8080)
pnpm build                 # type-check + production build
```

Mobile (`apps/mobile`): local iOS dev build via `pnpm ios` — see
`apps/mobile/AGENTS.md`.

## Docker

```bash
docker compose up          # builds the backend image + Postgres
```
