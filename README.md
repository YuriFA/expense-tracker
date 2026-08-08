# expense-tracker

Monorepo for the Expense Tracker product: a Go REST API and a Vue 3 web client,
with a mobile app planned.

## Structure

```
apps/
  web/      Vue 3 + Vite + Tailwind frontend
  mobile/   (planned)
backend/    Go REST API (Gin + SQLite + database/sql)
packages/   shared TS packages (planned)
docs/       API reference and product docs
```

The Go backend and the JS workspaces (`apps/*`, `packages/*`) are independent
toolchains. `bun install` only manages the JS side; it ignores `backend/`.

## Prerequisites

- Go 1.26+
- bun 1.3+ (JS workspaces)
- Docker (optional, for containerized backend)

## Backend

```bash
cd backend
cp .env.example .env       # CONFIG_PATH=./config/local.yaml
make dev                   # go run ./cmd/expense-tracker-api
make test                  # go test ./...
```

API runs on `http://localhost:8080`. Local SQLite is created at
`backend/storage/storage.db` (see `backend/config/local.yaml`).

## Frontend

```bash
bun install                # from repo root (installs all workspaces)
cd apps/web
bun run dev                # Vite dev server on :5173
bun run build              # type-check + production build
```

## Docker

```bash
docker compose up          # builds backend image from ./backend
```

## Layout notes

- Backend lives under `backend/`, not at the repo root, so the root stays clean
  for monorepo tooling. The Go module path is unchanged
  (`github.com/yurifa/expense-tracker-api`) - it is independent of the on-disk
  location.
- `apps/` holds JS/TS client applications managed as bun workspaces.
- CI (`.github/workflows`) runs Go with `working-directory: backend` and builds
  the Docker image with `context: backend`.
