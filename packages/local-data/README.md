# @expense-tracker/local-data

The platform-neutral local-first data layer shared by the clients: the drizzle
SQLite schema (6 entity tables + outbox/conflicts/meta plumbing), the outbox
mechanics, the sync engine with persistent conflict records, the local
repositories for every entity, the recurrence math for planned payments, and
the migrations journal. The web app (roadmap stage 4) consumes the same layer
over a browser SQLite driver.

## Platform seams (the package stays DOM/RN-free)

- **Database type** (`src/types.ts`): `LocalDatabase` is the generic drizzle
  SQLite surface (`BaseSQLiteDatabase<'sync', RunResult, typeof schema>`).
  Apps open their own driver and satisfy the type structurally — no expo
  types here.
- **Id factory** (`src/id-factory.ts`): defaults to WebCrypto
  `crypto.randomUUID()`; Hermes (React Native) has no WebCrypto, so the mobile
  bootstrap calls `configureIdFactory(expoCrypto.randomUUID)` before any
  database work.
- **Transport**: the sync engine takes an injected `SyncTransport`; the app
  binds it to the shared API client (`createApiTransport`).

## What stays in the apps

Driver opening + migrations call (expo-sqlite on mobile), the API-client
transport binding, background sync (expo), React contexts, and UI.

## Commands

- `pnpm type-check` — tsc, no emit.
- `pnpm test` — vitest over real SQLite (`node:sqlite`; Node >= 22.5).
- `pnpm db:generate` — drizzle-kit generate + inline the journal into
  `src/migrations.generated.ts`. Run after changing `src/schema.ts`; consumers
  apply the exported `migrations` through their own drizzle migrator.

## Testing entry

`@expense-tracker/local-data/testing` exports `createTestDatabase()` for
app-side test suites (mobile jest maps it in `jest.config.js`).
