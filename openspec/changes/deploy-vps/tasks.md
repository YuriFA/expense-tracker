## 1. Web image

- [x] 1.1 `apps/web/Dockerfile`: multi-stage (repo-root context) — pnpm
      workspace install → `vite build` → copy `dist` into `nginx:alpine`
      with the SPA/conf nginx config
- [x] 1.2 `apps/web/nginx.conf` (or conf.d include): SPA fallback
      (`try_files … /index.html`), `immutable` for `/assets/`, revalidate
      for `index.html`/manifest/SW files, gzip
- [x] 1.3 Local verification: `docker build` + `docker run` → `/` serves
      the shell, deep link serves the shell, asset cache headers correct

## 2. Production compose

- [x] 2.1 `docker-compose.prod.yml`: `db`/`api`/`web` from GHCR
      (`${IMAGE_TAG}`), `restart: unless-stopped`, log rotation, no host
      ports, `expose` only, api+web on the external `web` network
      (`external: true`)
- [x] 2.2 Traefik labels: api router `Host(<sub>) && PathPrefix(/api/)`
      with explicit priority; web router `Host(<sub>)`; both
      `entrypoints=websecure`, `tls.certresolver=le`; service ports 8080/80
- [x] 2.3 Healthchecks: db `pg_isready`, api `wget -q
      localhost:8080/api/health`, web `wget -q localhost/`; `depends_on`
      conditions (api waits for db healthy)
- [x] 2.4 Env plumbing: verify exact env names against
      `internal/config/config.go` tags and wire through compose —
      `DATABASE_URL`, allowed origins (`https://<sub>`), `TRUSTED_PROXIES`,
      `SESSION_SECURE`, `GHCR_REPO`, `IMAGE_TAG`, `SITE_ADDRESS`
- [x] 2.5 Commit `.env.production.example` (placeholders only); confirm no
      secret values land in the repo

## 3. CI deploy pipeline

- [x] 3.1 Extend `.github/workflows/deploy.yml`: build+push **both**
      images (api + web) with `sha-<short>` and `main` tags; trigger:
      manual `workflow_dispatch` only with optional `image_tag` input
      (amended 2026-08-30 — auto-deploy on push removed by decision)
- [x] 3.2 Deploy job: SSH (`VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` secrets) →
      `docker network create web || true` → GHCR login (VPS-side
      `GHCR_TOKEN`) → `IMAGE_TAG=<tag> docker compose -f
      docker-compose.prod.yml pull && up -d --remove-orphans` → prune old
      repo images
- [x] 3.3 Rollback check: manual dispatch with a previous `sha-` tag
      re-creates the stack from it (verified on the VPS at deploy time)

- [x] 3.5 Workstation deploy path: root `Makefile` (`deploy` / `rollback
      TAG=` / `deploy-remote`) mirroring the workflow — same images, tags,
      and remote sequence; `.deploy.env` (SSH_TARGET) gitignored and
      docker-ignored; runbook section added. Added 2026-08-30 post-apply
      as a second deploy path by decision.

## 4. Runbook

- [x] 4.1 `docs/deployment.md`: prerequisites (gateway present, DNS A
      record), first boot (network, `.env`, up), redeploy, rollback,
      trusted-proxy IP verification step, logs/health inspection
- [x] 4.2 Cross-reference zvonok's gateway plan for the first-gateway-boot
      case (fresh VPS where `~/gateway` is not up yet)

## 5. Gates

- [x] 5.1 Repo gates unaffected: `pnpm -C apps/web build` clean (image
      builds from it), `openspec validate deploy-vps --strict`; compose
      config validates (`docker compose -f docker-compose.prod.yml config`)
- [x] 5.2 Live smoke on the VPS at deploy time (runbook checklist):
      `GET /api/health` via the subdomain, web shell loads, register +
      login round-trip, sync push/pull from a client

Deploy-time notes (2026-08-30): first boot passed behind the live
zvonok gateway; the web healthcheck IPv6/localhost gotcha and the
workstation arm64 build issue were found and fixed live (see
Deviations); rollback was verified BOTH directions with
`make rollback TAG=sha-03aad8d` → `make rollback TAG=sha-d74a6a5`;
smoke checklist confirmed by the operator.
