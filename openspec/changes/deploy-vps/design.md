## Context

The VPS hosts zvonok behind a shared Traefik gateway (`~/gateway`, external
`web` network, per-site subdomains, Let's Encrypt on the edge —
`zvonok/docs/traefik-migration-plan.md`, implemented in zvonok's prod
compose with `traefik.*` labels). The backend already has a CGO-free
Dockerfile (prod.yaml baked in, `:8080`) and a manual GHCR workflow
(`deploy.yml`, sha tag only). Web is a built PWA (`pnpm build` → `dist`).
`TRUSTED_PROXIES`, CORS origins, `SESSION_SECURE`, and `DATABASE_URL` are
env-overridable via `internal/config` env tags. `backend-hardening` (prior
change in the series) adds `GET /api/health`.

## Goals / Non-Goals

- Goals: join the existing gateway as an independent site; one-merge
  deploys; rollback by tag; a runbook that makes the VPS reproducible.
- Non-Goals: the gateway itself (owned by the zvonok side — we only join
  `web`); any client code change; migrations tooling beyond the API's
  startup migrations; monitoring/alerting (later stage); blue-green or
  zero-downtime schemes.

## Decisions

1. **Two Traefik routers, no inner proxy.** Unlike zvonok (which keeps an
   internal Caddy for SPA+API routing), our stack is simple enough to route
   at the edge: `api` labels claim `Host(<sub>) && PathPrefix(/api/)` with
   explicit router priority, `web` labels claim `Host(<sub>)`. Alternative —
   an inner nginx proxying `/api` to the API container — rejected: adds a
   hop and duplicates what the gateway already does.
2. **Web image = nginx:alpine serving `dist`.** Multi-stage `node:22-alpine`
   (corepack/pnpm install → `pnpm -C apps/web build`... actually build from
   repo root for workspace deps) → `nginx:1.27-alpine` with a small
   `nginx.conf`: `try_files ... /index.html` fallback, `immutable`
   cache for `/assets/`, `no-cache` for `index.html` and the PWA files
   (`manifest.webmanifest`, `registerSW.js`, sw-related), gzip on.
   Alternative: caddy image — nginx is enough and is the thinner standard.
3. **Prod compose mirrors zvonok's shape**: `image: ghcr.io/<repo>/…:${IMAGE_TAG}`,
   `restart: unless-stopped`, json-file log rotation (10–20m/3), db
   healthcheck `pg_isready`, api healthcheck curl-less via `wget -q
   http://localhost:8080/api/health` (alpine has wget; no extra tooling),
   web healthcheck `wget -q http://localhost/`. No `ports:` at all —
   `expose` only; `networks: [default, web]` on api and web.
4. **Migrations stay in the API entrypoint** (already run at boot); the db
   service gates startup via `depends_on: condition: service_healthy`.
   Deploy = pull + up -d; brief API restart is acceptable (family scale,
   local-first clients queue their sync).
5. **Registry layout**: `ghcr.io/<owner>/<repo>` for api (unchanged) and
   `ghcr.io/<owner>/<repo>-web` for web (separate repos keep tags
   independent; matches the existing single-image workflow with one
   addition). Tags: `sha-<short>` + `main`.
6. **Deploy job secrets**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`;
   GHCR auth on the VPS via a PAT stored in `~/expense-tracker/.env`
   (zvonok's pattern — `GHCR_TOKEN` is a VPS-side secret, not a GH
   secret). Script: `docker network create web || true`, login, pull, up
   `-d --remove-orphans`, prune old repo images. Trigger: `push: main` +
   `workflow_dispatch` (with optional `image_tag` input for rollback).
7. **Env overrides over baked prod.yaml**: the compose passes
   `HTTP_SERVER_CORS_ALLOWED_ORIGINS`-style env (exact names verified
   against `internal/config/config.go` env tags at implementation),
   `TRUSTED_PROXIES` = the docker bridge subnet the gateway speaks from
   (e.g. `172.16.0.0/12`; verified on the VPS at first boot and pinned in
   `.env`), `SESSION_SECURE=true` (prod.yaml default), `DATABASE_URL` from
   `.env`. Committed: `.env.production.example` with placeholders only.

## Risks / Trade-offs

- [Router precedence: `Host` rule also matches `/api/*` if priorities
  collide] → explicit `traefik.http.routers.<name>.priority` on the api
  router (higher than web's).
- [Trusted-proxy subnet guessed wrong → rate limiter sees the gateway IP
  for everyone, or trusts client-supplied `X-Forwarded-For`] → runbook step
  verifies the actual source IP seen by the API right after first boot;
  value is env, not code.
- [Varying `IMAGE_TAG` drift between api and web during rollback] → deploy
  script passes one `IMAGE_TAG` to compose for both; both repos carry the
  same tag vocabulary.
- [Web build in CI needs the full pnpm workspace (packages/* source
   resolution)] → image build context is the repo root, Dockerfile at
   `apps/web/Dockerfile` builds from root context; `pnpm deploy`-style
   pruning rejected as over-engineering for now.
- [First boot order: gateway must own 80/443 before sites join] → runbook
  follows zvonok's execution order; joining a running gateway is a no-op
  for ports.

## Migration Plan

First boot (runbook): VPS `~/expense-tracker` with compose + `.env`;
`docker network create web || true`; DNS A-record `<sub> → VPS IP`;
`docker compose ... up -d`. Subsequent: push to main. Rollback: manual
dispatch with the previous `sha-` tag. Teardown: `docker compose down`
(gateway and zvonok untouched).

## Open Questions

- Exact GHCR repo naming for the web image (`-web` suffix vs
  `<repo>/web`) — implementation picks the simpler workflow expression;
  no spec impact.

## Deviations during implementation

- **Real env name is `CORS_ALLOWED_ORIGINS`**, not the design's guessed
  `HTTP_SERVER_CORS_ALLOWED_ORIGINS` — wired with the verified tag from
  `internal/config/config.go`.
- **The web image build requires the repo `.npmrc`** (`node-linker=hoisted`):
  vite-plugin-pwa's virtual module imports `workbox-window`, which resolves
  only through the hoisted layout — it is an undeclared dependency of
  `apps/web` (clean isolated installs fail). The Dockerfile copies `.npmrc`
  before install; the proper fix (declaring the dep) is recorded in
  `docs/technical-debt.md`.
- **`apps/mobile/.maestro` (~21 GB of local flow output) entered the Docker
  context** and filled the disk mid-build; `.dockerignore` now keeps only
  `apps/mobile/package.json` (needed for the pnpm workspace graph).
- **`autoheal` sidecar added at review time**: plain Docker restarts
  containers on exit but NOT running-but-unhealthy ones, so the spec's
  "unhealthy API is restarted" scenario would only hold for dead
  processes. The sidecar watches the `autoheal=true` label (api, web) and
  restarts on health failure; the runbook keeps manual restart as the
  override.
- **Tasks 3.3 (rollback dispatch) and 5.2 (live smoke) are deploy-time**,
  as their own wording states — they need the real VPS and stay open until
  the first deployment runs the runbook checklists.
