# Deployment runbook

How the expense tracker is built into images and served in production:
a manual workflow dispatch makes CI build both images, push to GHCR, and
redeploy the VPS stack over SSH (nothing fires on push — decided
2026-08-30). The stack joins the VPS's shared Traefik gateway and
publishes no host ports of its own.

```
client → https://<subdomain>
       → Traefik gateway (~/gateway, ports 80/443, TLS + Let's Encrypt)
         ├─ Host(<sub>) && PathPrefix(/api/) → api container :8080
         └─ Host(<sub>)                       → web container (nginx) :80
                                                  └─ db (postgres) :5432, internal only
```

## Pieces

| Piece | Where |
|---|---|
| Web image (nginx serving the built PWA) | `apps/web/Dockerfile`, `apps/web/nginx.conf` — GHCR `<repo>-web` |
| API image (CGO-free Go binary) | `backend/Dockerfile` — GHCR `<repo>` |
| Production stack | `docker-compose.prod.yml` + `.env` on the VPS |
| Build + deploy pipeline | `.github/workflows/deploy.yml` |
| Environment example | `.env.production.example` |

## Prerequisites

- A VPS with Docker + the compose plugin installed.
- The shared Traefik gateway running at `~/gateway` on the external
  `web` network, owning ports 80/443.
  **Fresh VPS where the gateway is not up yet?** Set it up first — the
  gateway must own 80/443 before any site joins. Follow the zvonok
  plan (`zvonok/docs/traefik-migration-plan.md`, "Set Up Traefik
  Gateway" + "Execution Order on VPS"): `docker network create web`,
  prepare `~/gateway` (compose + `.env` with `ACME_EMAIL`,
  `acme.json` chmod 600), `docker compose up -d`. Joining an
  already-running gateway is a no-op for ports.
- A DNS A record `<subdomain> → VPS IP`.
- GitHub repo secrets for deploys: `VPS_HOST`, `VPS_USER`,
  `VPS_SSH_KEY` (the SSH deploy key).
- A GitHub classic PAT with `read:packages` for VPS pulls (goes in the
  VPS `.env`, not in GitHub).

> **Before the VPS side exists:** a dispatch still builds and publishes
> both images (the `main` tag powers the first boot below), but the
> deploy job fails at the SSH step. That is expected until
> `VPS_HOST`/`VPS_USER`/`VPS_SSH_KEY` secrets and `~/expense-tracker/.env`
> are in place.

## First boot (once per VPS)

```bash
# on the VPS
mkdir -p ~/expense-tracker && cd ~/expense-tracker

# stack definition: scp from a checkout, or let the first deploy job
# copy it (the workflow scps docker-compose.prod.yml every deploy)
scp docker-compose.prod.yml vps:~/expense-tracker/

# secrets + site facts — never commit the real .env
cp .env.production.example .env
$EDITOR .env          # SITE_ADDRESS, GHCR_REPO/USER/TOKEN, POSTGRES_PASSWORD, ...

# shared network with the gateway (idempotent)
docker network create web 2>/dev/null || true

# GHCR pull auth, then bring the stack up
set -a; . ./.env; set +a
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
IMAGE_TAG=main docker compose -f docker-compose.prod.yml pull
IMAGE_TAG=main docker compose -f docker-compose.prod.yml up -d
```

The gateway provisions the Let's Encrypt certificate on the first
HTTPS request to the subdomain — nothing to do on this side.

### Verify the trusted-proxy subnet (right after first boot)

The API must trust exactly the subnet the gateway speaks from, or
client-IP rate limits (register/failure lockout) see the gateway IP
for everyone. The `.env` default (`172.16.0.0/12`) covers the usual
Docker bridge range — confirm it against the actual network:

```bash
docker network inspect web --format \
  '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}'
# traefik's entry, e.g. "traefik 172.18.0.2/16" → pin TRUSTED_PROXIES=172.18.0.0/16
```

If it differs from what `.env` says, update `TRUSTED_PROXIES` and
`docker compose -f docker-compose.prod.yml up -d api` to apply. A
functional check: hit `https://<subdomain>/api/health` — the API
responds regardless; wrong proxies only distort per-IP limiting.

## Redeploy

Manual only (nothing fires on push): Actions → "Build and deploy" →
Run workflow, leave `image_tag` empty. CI builds both images from HEAD
(`sha-<short>` + `main` tags), then SSHes to the VPS:
`docker network create web || true`, GHCR login from the VPS `.env`,
`pull`, `up -d --remove-orphans`, prune of stale local images. The API
restarts briefly (boot migrations re-run as needed); offline-capable
clients queue their sync.

## Rollback

Actions → "Build and deploy" → Run workflow with `image_tag` set to a
previous tag (`sha-<short>` of the last known-good commit; tags are
listed on the GHCR package page). The build job is skipped — the VPS
pulls the pinned tag for BOTH api and web (one `IMAGE_TAG` drives
both) and recreates the stack from it.

```bash
# equivalently, by hand on the VPS:
cd ~/expense-tracker && set -a; . ./.env; set +a
IMAGE_TAG=sha-abc1234 docker compose -f docker-compose.prod.yml pull
IMAGE_TAG=sha-abc1234 docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

## Health & logs

```bash
docker compose -f docker-compose.prod.yml ps        # health of all three
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f db

# psql into the database
docker compose -f docker-compose.prod.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Healthchecks: db `pg_isready`, api `wget /api/health`, web `wget /`.
Containers restart on exit (`restart: unless-stopped`); a container that
is running but `unhealthy` (process hung, not exited) is restarted by the
`autoheal` sidecar, which watches the `autoheal=true` label on api/web and
restarts them ~10s after the healthcheck goes bad. Manual
`docker compose -f docker-compose.prod.yml restart <service>` remains the
override if you ever want to force it.

## Teardown

```bash
cd ~/expense-tracker && docker compose -f docker-compose.prod.yml down
```

Removes this stack only; the gateway, zvonok, and the `web` network
are untouched. Add `-v` to also drop the database volume
(**destructive** — the data has no other copy).

## Deploy-time smoke checklist

Run after first boot and after any deploy that changes routing,
config, or the API surface:

- [ ] `curl -fsS https://<subdomain>/api/health` → `{"status":"ok"}`
- [ ] `curl -fsS https://<subdomain>/` → HTML shell; the app renders in a browser
- [ ] Deep link (e.g. `https://<subdomain>/login`) serves the shell (HTTP 200, no 404)
- [ ] `curl -sI https://<subdomain>/assets/<hashed>.js | grep -i cache-control` → `immutable`
- [ ] `curl -sI https://<subdomain>/sw.js | grep -i cache-control` → `no-cache`
- [ ] Register + login round-trip in the web app (session cookie set)
- [ ] Mobile client: sync push/pull against the subdomain
- [ ] `docker compose -f docker-compose.prod.yml ps` → all `(healthy)`
