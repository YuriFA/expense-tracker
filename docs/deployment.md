# Deployment runbook

How the expense tracker is built into images and served in production:
a manual workflow dispatch makes CI build the images (api, web, backup),
push to GHCR, and redeploy the VPS stack over SSH (nothing fires on
push — decided 2026-08-30). The stack joins the VPS's shared Traefik
gateway and publishes no host ports of its own.

```
client → https://<subdomain>
       → Traefik gateway (~/gateway, ports 80/443, TLS + Let's Encrypt)
         ├─ Host(<sub>) && PathPrefix(/api/) → api container :8080
         └─ Host(<sub>)                       → web container (nginx) :80
                                                  └─ db (postgres) :5432, internal only
                                                       └─ backup sidecar: nightly dumps →
                                                         backups volume (+ rclone off-site)
```

## Pieces

| Piece | Where |
|---|---|
| Web image (nginx serving the built PWA) | `apps/web/Dockerfile`, `apps/web/nginx.conf` — GHCR `<repo>-web` |
| API image (CGO-free Go binary) | `backend/Dockerfile` — GHCR `<repo>` |
| Backup sidecar (pg_dump + rclone + crond) | `deploy/backup/` — GHCR `<repo>-backup` |
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
$EDITOR .env          # SITE_ADDRESS, GHCR_REPO/USER/TOKEN, POSTGRES_PASSWORD,
                      # SMTP_* (email relay; empty = log-only),
                      # RCLONE_REMOTE (optional off-site backups, see Backups)

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

## Deploy from a laptop (make deploy)

The repository root Makefile is a second, CI-free deploy path producing
the same images, tags, and stack state — the two paths are
interchangeable (use whichever is at hand; GHCR keeps one shared tag
history).

One-time setup on the workstation:

```bash
echo 'SSH_TARGET=deploy@<vps-ip>' > .deploy.env   # gitignored; or an ~/.ssh/config alias
docker login ghcr.io -u <github-user>              # PAT with write:packages
```

```bash
make deploy                     # build + push + deploy current HEAD
make rollback TAG=sha-03aad8d   # redeploy an already-pushed tag (no build)
```

It derives the GHCR repo from `git remote get-url origin`, builds the
same two images with `sha-<short>` + `main` tags, and runs the same
remote sequence as CI (scp compose → GHCR login from the VPS `.env` →
pull → `up -d --remove-orphans` → prune stale local images).

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

## Backups

The `backup` service (image `deploy/backup/`, built and pushed alongside
api/web) dumps the database nightly and can replicate it off-site:

- **What**: `pg_dump` (plain SQL, `--no-owner --no-privileges`) gzipped to
  `backups_data:/backups` as `expense-YYYYmmdd-HHMMSS.sql.gz` (UTC).
- **When**: `BACKUP_SCHEDULE` cron, default `0 3 * * *` (UTC) — 5-field
  numeric syntax only; anything else crash-loops the container on purpose
  (busybox crond silently skips unparseable schedules otherwise).
- **Retention**: 7 most recent daily dumps + the newest dump of each of the
  4 most recent ISO weeks (~11 files).
- **Off-site**: `rclone copy /backups $RCLONE_REMOTE` after each successful
  dump when `RCLONE_REMOTE` is set; a warning is logged each run otherwise.
- **Failure visibility**: dump or replication failures log `ERROR` and exit
  non-zero — `docker compose -f docker-compose.prod.yml logs backup`
  shows it; retained dumps are never touched by a failed run.

### Off-site target setup (once per VPS)

Any rclone backend works (S3, B2, another box over sftp, ...). The remote
config persists in the `rclone_config` volume; create it with a one-shot
run (example: S3):

```bash
cd ~/expense-tracker
. ./.env  # optional: export RCLONE_CONFIG_* creds instead of pasting them
docker compose -f docker-compose.prod.yml run --rm --entrypoint rclone backup \
  config create offsite s3 \
  provider=AWS access_key_id=AKIA... secret_access_key=... region=eu-central-1

# point the sidecar at it and recreate the service
echo 'RCLONE_REMOTE=offsite:expense-tracker' >> .env
docker compose -f docker-compose.prod.yml up -d backup

# verify after the next scheduled run (or a manual one, below)
docker compose -f docker-compose.prod.yml exec backup rclone ls "$RCLONE_REMOTE"
```

No off-site target yet? Leave `RCLONE_REMOTE` empty — backups stay
local-only with a per-run warning (the VPS volume is still the only real
copy, so set this up before caring about the data).

### Restore procedure

Dumps are owner-agnostic plain SQL: `gunzip -c | psql` into the target.
On the VPS (point-in-time restore over the current database):

```bash
cd ~/expense-tracker && set -a; . ./.env; set +a

# 1. Stop writes (the API runs migrations at boot, so it also re-upgrades
#    an older dump on the way back up).
docker compose -f docker-compose.prod.yml stop api

# 2. Pick the dump to restore (newest last)
docker compose -f docker-compose.prod.yml exec backup ls -lt /backups | head

# 3. Reset the schema and pipe the dump in
#    (docker compose exec needs -T: no tty on a pipe)
docker compose -f docker-compose.prod.yml exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
docker compose -f docker-compose.prod.yml exec backup \
  sh -c 'gunzip -c /backups/expense-<stamp>.sql.gz' | \
  docker compose -f docker-compose.prod.yml exec -T db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -q

# 4. Bring the API back and verify
docker compose -f docker-compose.prod.yml start api
curl -fsS https://<subdomain>/api/health
```

Total loss (fresh VPS/volume): bring the stack up as in First boot, copy a
kept dump into the new volume (`docker cp` + a temporary bind or
`rclone copy` from the off-site target), then steps 3-4 above.

This path is proven: the local smoke (change `ops-backups-email`) dumps a
seeded scratch Postgres, restores into a fresh one, and serves the backed-
up data through the API. A monthly spot-check keeps it honest:

- [ ] `ls -lt /backups` shows fresh dumps (nightly cadence)
- [ ] off-site: `exec backup rclone ls "$RCLONE_REMOTE"` lists them too
- [ ] test-restore the newest dump into a scratch database (laptop or a
  throwaway container) and eyeball the data

## Health & logs

```bash
docker compose -f docker-compose.prod.yml ps        # health of all services
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f db
docker compose -f docker-compose.prod.yml logs backup   # nightly dump log

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
are untouched. Add `-v` to also drop the database and backups volumes
(**destructive** — with off-site replication off, the `.env` and rclone
credentials elsewhere are all that let you rebuild; copy dumps out first,
see Backups below).

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
- [ ] `docker compose -f docker-compose.prod.yml logs backup` → `backup
  sidecar ready: schedule ...` (and, if SMTP is configured, a verification
  email arrives instead of appearing only in `logs api`)
- [ ] Trigger a manual backup run and watch it succeed:
  `docker compose -f docker-compose.prod.yml run --rm --entrypoint /app/backup.sh backup`
- [ ] `docker compose -f docker-compose.prod.yml ps` → all `(healthy)`
