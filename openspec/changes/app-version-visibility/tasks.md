## 1. Contract

- [ ] 1.1 `docs/api/openapi.yaml`: `Health` schema gains required
      `version` (string; the deployed image tag or `dev`); update the
      `/api/health` description accordingly
- [ ] 1.2 Regenerate + commit: `make gen` (api.gen.go) and `pnpm gen:api`
      (schema.ts); `make gen-check` (staged) green

## 2. Backend version

- [ ] 2.1 `backend/Dockerfile`: `ARG VERSION=dev` → inject via
      `-ldflags "-X main.version=$VERSION"` in the build step
- [ ] 2.2 `cmd/expense-tracker-api/main.go`: package-level version var +
      accessor; health handler returns it in the payload
- [ ] 2.3 Tests: health payload carries the injected version; default is
      `dev` (unit-level, no docker)

## 3. Web version

- [ ] 3.1 `apps/web/Dockerfile`: `ARG VERSION=dev` → `ENV
      VITE_APP_VERSION=$VERSION`; Vite `define` exposes
      `__APP_VERSION__` (typed; falls back to `dev`)
- [ ] 3.2 `main.ts`: one `console.info` after mount with the web version;
      fire-and-forget `fetch('/api/health')` appends the API version when
      reachable; offline start logs the web-only line without errors
- [ ] 3.3 Unit test for the version helper (fallback + injected value);
      console line covered where cheap, not snapshotted

## 4. Deploy plumbing

- [ ] 4.1 `deploy.yml`: pass `--build-arg VERSION=<sha-<short>>` to both
      image builds (reuse the computed tag output)
- [ ] 4.2 Root `Makefile`: pass `VERSION=sha-$(SHORT_SHA)` to both builds
      (same for api and web)

## 5. Gates

- [ ] 5.1 Backend: `go test -race ./...`, lint, gen-check; web:
      type-check + unit + lint + i18n:lint; `openspec validate
      app-version-visibility --strict`
- [ ] 5.2 Deploy-time check (next deploy): `curl
      https://<host>/api/health` shows the sha; browser console shows
      `web sha-… · api sha-…`
