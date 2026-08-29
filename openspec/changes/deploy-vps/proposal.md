## Why

Roadmap stage 6 puts the product on the public internet. The VPS already
runs the zvonok project behind a shared Traefik gateway (external `web`
network, `~/gateway`, per-site subdomains — `zvonok/docs/traefik-migration-plan.md`);
the expense tracker must join that topology as an independent site, with
CI-built images and a one-command redeploy.

## What Changes

- `apps/web/Dockerfile`: multi-stage build (pnpm install + `vite build`) →
  `nginx:alpine` serving the PWA static assets (dist) with SPA fallback
  and cache headers for the hashed assets.
- `docker-compose.prod.yml` (repo root): `db`, `api`, `web` services;
  `restart: unless-stopped`; healthchecks (db `pg_isready`, api
  `/api/health`, web via nginx); log rotation; Traefik labels on `api`
  (`Host(<subdomain>) && PathPrefix(/api/)`) and `web` (`Host(<subdomain>)`);
  joins the external `web` network; no host ports published.
- `deploy.yml`: build both images on `push to main` (plus manual
  `workflow_dispatch`), tags `sha-<short>` and `main`, push to GHCR;
  deploy job SSHes to the VPS, `docker network create web || true`,
  `docker compose -f docker-compose.prod.yml pull && up -d --remove-orphans`,
  prunes stale repo images (zvonok's pattern).
- Production config through env: allowed origins `https://<subdomain>`,
  `TRUSTED_PROXIES` = gateway docker subnet, `SESSION_SECURE=true`
  (already the prod.yaml default), `DATABASE_URL` with VPS secrets from
  `.env` (never committed; `.env.production.example` committed).
- Runbook `docs/deployment.md`: first boot (gateway up order per zvonok's
  plan), DNS A-record, `.env` secrets, deploy, rollback to a previous
  `sha-` tag, log inspection.

## Capabilities

### New Capabilities
- `deployment`: how the product is built into images and served in
  production — edge routing behind the shared gateway, CI deployment,
  environment configuration, and the operational runbook.

### Modified Capabilities

None. Client and API behavior are unchanged; `api-hardening` (separate
change) supplies the health endpoint this deployment consumes.

## Impact

- **Repo**: new web Dockerfile + nginx config; new prod compose + env
  example; `deploy.yml` extended (web image + deploy job, SSH secrets
  `VPS_HOST`, `VPS_USER`, `SSH_KEY`, `GHCR_TOKEN`-on-VPS); new
  `docs/deployment.md`.
- **Backend**: no code change; consumes env overrides already declared in
  `internal/config` (origins, trusted proxies, session flags, DB URL).
- **VPS**: `~/expense-tracker/` checkout of compose + env; shared `web`
  network and `~/gateway` Traefik already managed by the zvonok side.
- **Depends on**: `backend-hardening` for `GET /api/health` (compose
  healthcheck) and the register rate limit — deploy this after that change.
